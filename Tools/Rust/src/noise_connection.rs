//! Noise protocol connection handler for ESPHome Native API.
//!
//! Implements the Noise_NNpsk0_25519_ChaChaPoly_SHA256 handshake and encrypted
//! frame transport used by ESPHome's native API on port 6053.

use base64::Engine;
use snow::{Builder, TransportState};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

/// An established Noise-encrypted connection to an ESPHome device.
pub struct NoiseConnection {
    stream: TcpStream,
    transport: TransportState,
    /// Whether we are the initiator (true) or responder (false).
    /// Needed to know which nonce counter applies to encrypt vs decrypt.
    is_initiator: bool,
}

impl NoiseConnection {
    /// Connect to an ESPHome device, perform the Noise handshake, and return
    /// an encrypted connection ready for sending/receiving protobuf messages.
    pub async fn connect(
        host: &str,
        port: u16,
        encryption_key: &str,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        // Decode the PSK from base64
        let psk = base64::engine::general_purpose::STANDARD.decode(encryption_key)?;
        if psk.len() != 32 {
            return Err(format!(
                "Encryption key must decode to 32 bytes, got {}",
                psk.len()
            )
            .into());
        }

        // Connect TCP
        let mut stream = TcpStream::connect(format!("{}:{}", host, port)).await?;

        // Build the Noise protocol state
        let builder = Builder::new("Noise_NNpsk0_25519_ChaChaPoly_SHA256".parse()?)
            .psk(0, &psk)
            .prologue(b"NoiseAPIInit\x00\x00");
        let mut handshake = builder.build_initiator()?;

        // === Phase 1: Send ClientHello ===
        // The ESPHome protocol sends NOISE_HELLO + handshake frame in one write.
        // NOISE_HELLO = [0x01, 0x00, 0x00]
        // Handshake frame = [0x01, len_high, len_low, 0x00, noise_handshake_message...]

        let mut handshake_msg = vec![0u8; 128];
        let handshake_len = handshake.write_message(&[], &mut handshake_msg)?;
        handshake_msg.truncate(handshake_len);

        // Build the combined packet: NOISE_HELLO + frame header + 0x00 prefix + handshake
        let frame_payload_len = 1 + handshake_len; // 0x00 prefix byte + handshake data
        let mut client_hello = Vec::with_capacity(3 + 3 + frame_payload_len);
        // NOISE_HELLO
        client_hello.extend_from_slice(&[0x01, 0x00, 0x00]);
        // Frame header: [0x01, len_high, len_low]
        client_hello.push(0x01);
        client_hello.push(((frame_payload_len >> 8) & 0xFF) as u8);
        client_hello.push((frame_payload_len & 0xFF) as u8);
        // Payload: [0x00 prefix, handshake_data...]
        client_hello.push(0x00);
        client_hello.extend_from_slice(&handshake_msg);

        stream.write_all(&client_hello).await?;

        // === Phase 2: Read ServerHello ===
        // Server sends: [0x01, len_high, len_low, chosen_proto, server_name\0, mac\0]
        let mut header = [0u8; 3];
        stream.read_exact(&mut header).await?;
        if header[0] != 0x01 {
            return Err(format!(
                "Expected Noise marker byte 0x01, got 0x{:02x}",
                header[0]
            )
            .into());
        }
        let server_hello_len = ((header[1] as usize) << 8) | (header[2] as usize);
        let mut server_hello = vec![0u8; server_hello_len];
        stream.read_exact(&mut server_hello).await?;

        if server_hello.is_empty() {
            return Err("ServerHello is empty".into());
        }

        let chosen_proto = server_hello[0];
        if chosen_proto != 0x01 {
            return Err(format!(
                "Unknown protocol selected by server: {}",
                chosen_proto
            )
            .into());
        }

        // === Phase 3: Read Handshake Response ===
        // Server sends: [0x01, len_high, len_low, 0x00, noise_handshake_data...]
        let mut header2 = [0u8; 3];
        stream.read_exact(&mut header2).await?;
        if header2[0] != 0x01 {
            return Err(format!(
                "Expected Noise marker byte 0x01 for handshake response, got 0x{:02x}",
                header2[0]
            )
            .into());
        }
        let hs_resp_len = ((header2[1] as usize) << 8) | (header2[2] as usize);
        let mut hs_resp = vec![0u8; hs_resp_len];
        stream.read_exact(&mut hs_resp).await?;

        if hs_resp.is_empty() {
            return Err("Handshake response is empty".into());
        }

        // First byte should be 0x00 (success prefix)
        if hs_resp[0] != 0x00 {
            // Error: the rest is an error message
            let error_msg = if hs_resp.len() > 1 {
                String::from_utf8_lossy(&hs_resp[1..]).to_string()
            } else {
                "Unknown handshake error".to_string()
            };
            return Err(format!("Handshake failed: {}", error_msg).into());
        }

        // Process the Noise handshake response
        let mut payload = vec![0u8; 128];
        let _payload_len = handshake.read_message(&hs_resp[1..], &mut payload)?;

        // Transition to transport mode
        let transport = handshake.into_transport_mode()?;

        Ok(NoiseConnection {
            stream,
            transport,
            is_initiator: true,
        })
    }

    /// Send an encrypted protobuf message.
    ///
    /// The plaintext frame format inside the encryption is:
    /// [type_high, type_low, data_len_high, data_len_low, protobuf_data...]
    pub async fn send_message(
        &mut self,
        msg_type: u16,
        data: &[u8],
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Build the plaintext: type(2) + length(2) + data
        let data_len = data.len();
        let mut plaintext = Vec::with_capacity(4 + data_len);
        plaintext.push((msg_type >> 8) as u8);
        plaintext.push((msg_type & 0xFF) as u8);
        plaintext.push((data_len >> 8) as u8);
        plaintext.push((data_len & 0xFF) as u8);
        plaintext.extend_from_slice(data);

        // Encrypt
        let mut ciphertext = vec![0u8; plaintext.len() + 16]; // +16 for auth tag
        let ct_len = self.transport.write_message(&plaintext, &mut ciphertext)?;
        ciphertext.truncate(ct_len);

        // Build frame: [0x01, len_high, len_low, encrypted_payload...]
        let mut frame = Vec::with_capacity(3 + ct_len);
        frame.push(0x01);
        frame.push(((ct_len >> 8) & 0xFF) as u8);
        frame.push((ct_len & 0xFF) as u8);
        frame.extend_from_slice(&ciphertext);

        self.stream.write_all(&frame).await?;
        Ok(())
    }

    /// Receive and decrypt a protobuf message.
    ///
    /// Returns (msg_type, protobuf_data).
    pub async fn recv_message(&mut self) -> Result<(u16, Vec<u8>), Box<dyn std::error::Error>> {
        // Read frame header
        let mut header = [0u8; 3];
        self.stream.read_exact(&mut header).await?;
        if header[0] != 0x01 {
            return Err(format!(
                "Expected Noise marker 0x01, got 0x{:02x}",
                header[0]
            )
            .into());
        }
        let frame_len = ((header[1] as usize) << 8) | (header[2] as usize);

        // Read encrypted payload
        let mut encrypted = vec![0u8; frame_len];
        self.stream.read_exact(&mut encrypted).await?;

        // Decrypt
        let mut plaintext = vec![0u8; frame_len]; // will be shorter after removing tag
        let pt_len = self.transport.read_message(&encrypted, &mut plaintext)?;
        plaintext.truncate(pt_len);

        if pt_len < 4 {
            return Err(format!("Decrypted message too short: {} bytes", pt_len).into());
        }

        // Parse: [type_high, type_low, data_len_high, data_len_low, data...]
        let msg_type = ((plaintext[0] as u16) << 8) | (plaintext[1] as u16);
        // We ignore the embedded length and use the actual remaining bytes
        let data = plaintext[4..].to_vec();

        Ok((msg_type, data))
    }
}
