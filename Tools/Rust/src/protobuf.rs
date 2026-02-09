//! Minimal protobuf encoder/decoder for the ESPHome Native API messages.
//!
//! We only need to encode/decode specific message types used in the handshake
//! and entity discovery flow. This avoids pulling in a full protobuf library.

use std::collections::HashMap;

// ========== Protobuf Wire Format Helpers ==========

/// Encode a varint (variable-length integer).
fn encode_varint(value: u64) -> Vec<u8> {
    let mut buf = Vec::new();
    let mut v = value;
    loop {
        let mut byte = (v & 0x7F) as u8;
        v >>= 7;
        if v != 0 {
            byte |= 0x80;
        }
        buf.push(byte);
        if v == 0 {
            break;
        }
    }
    buf
}

/// Decode a varint from `data` starting at `pos`. Returns (value, new_pos).
fn decode_varint(data: &[u8], pos: usize) -> (u64, usize) {
    let mut result: u64 = 0;
    let mut shift = 0;
    let mut i = pos;
    loop {
        if i >= data.len() {
            break;
        }
        let byte = data[i];
        result |= ((byte & 0x7F) as u64) << shift;
        i += 1;
        if byte & 0x80 == 0 {
            break;
        }
        shift += 7;
    }
    (result, i)
}

/// Encode a protobuf field: field_number + wire_type as a tag, then value.
fn encode_string_field(field: u32, value: &str) -> Vec<u8> {
    if value.is_empty() {
        return Vec::new();
    }
    let tag = (field << 3) | 2; // wire type 2 = length-delimited
    let mut buf = encode_varint(tag as u64);
    buf.extend_from_slice(&encode_varint(value.len() as u64));
    buf.extend_from_slice(value.as_bytes());
    buf
}

#[allow(dead_code)]
fn encode_uint32_field(field: u32, value: u32) -> Vec<u8> {
    if value == 0 {
        return Vec::new();
    }
    let tag = (field << 3) | 0; // wire type 0 = varint
    let mut buf = encode_varint(tag as u64);
    buf.extend_from_slice(&encode_varint(value as u64));
    buf
}

#[allow(dead_code)]
fn encode_fixed32_field(field: u32, value: u32) -> Vec<u8> {
    let tag = (field << 3) | 5; // wire type 5 = 32-bit
    let mut buf = encode_varint(tag as u64);
    buf.extend_from_slice(&value.to_le_bytes());
    buf
}

/// Decoded protobuf fields: maps field_number to list of values.
#[derive(Debug)]
pub struct ProtoFields {
    pub varints: HashMap<u32, Vec<u64>>,
    pub strings: HashMap<u32, Vec<String>>,
    pub fixed32: HashMap<u32, Vec<u32>>,
    pub fixed64: HashMap<u32, Vec<u64>>,
}

impl ProtoFields {
    pub fn decode(data: &[u8]) -> Self {
        let mut fields = ProtoFields {
            varints: HashMap::new(),
            strings: HashMap::new(),
            fixed32: HashMap::new(),
            fixed64: HashMap::new(),
        };

        let mut pos = 0;
        while pos < data.len() {
            let (tag, new_pos) = decode_varint(data, pos);
            pos = new_pos;
            let field_number = (tag >> 3) as u32;
            let wire_type = (tag & 7) as u8;

            match wire_type {
                0 => {
                    // Varint
                    let (value, new_pos) = decode_varint(data, pos);
                    pos = new_pos;
                    fields.varints.entry(field_number).or_default().push(value);
                }
                1 => {
                    // 64-bit
                    if pos + 8 <= data.len() {
                        let value = u64::from_le_bytes(data[pos..pos + 8].try_into().unwrap());
                        pos += 8;
                        fields.fixed64.entry(field_number).or_default().push(value);
                    } else {
                        break;
                    }
                }
                2 => {
                    // Length-delimited
                    let (length, new_pos) = decode_varint(data, pos);
                    pos = new_pos;
                    let length = length as usize;
                    if pos + length <= data.len() {
                        let value = String::from_utf8_lossy(&data[pos..pos + length]).to_string();
                        fields.strings.entry(field_number).or_default().push(value);
                    }
                    pos += length;
                }
                5 => {
                    // 32-bit
                    if pos + 4 <= data.len() {
                        let value = u32::from_le_bytes(data[pos..pos + 4].try_into().unwrap());
                        pos += 4;
                        fields.fixed32.entry(field_number).or_default().push(value);
                    } else {
                        break;
                    }
                }
                _ => {
                    // Unknown wire type, skip to end
                    break;
                }
            }
        }

        fields
    }

    pub fn get_string(&self, field: u32) -> String {
        self.strings
            .get(&field)
            .and_then(|v| v.first())
            .cloned()
            .unwrap_or_default()
    }

    pub fn get_varint(&self, field: u32) -> u64 {
        self.varints
            .get(&field)
            .and_then(|v| v.first())
            .copied()
            .unwrap_or(0)
    }

    pub fn get_fixed32(&self, field: u32) -> u32 {
        self.fixed32
            .get(&field)
            .and_then(|v| v.first())
            .copied()
            .unwrap_or(0)
    }

    pub fn get_bool(&self, field: u32) -> bool {
        self.get_varint(field) != 0
    }
}

// ========== ESPHome Message Types ==========

/// HelloRequest (msg type 1)
/// Fields: 1=client_info(string), 2=api_version_major(uint32), 3=api_version_minor(uint32)
pub fn encode_hello_request(client_info: &str) -> Vec<u8> {
    let mut buf = Vec::new();
    buf.extend_from_slice(&encode_string_field(1, client_info));
    // API version 1.10 (current)
    buf.extend_from_slice(&encode_uint32_field(2, 1));
    buf.extend_from_slice(&encode_uint32_field(3, 10));
    buf
}

/// HelloResponse (msg type 2)
/// Fields: 1=api_version_major(uint32), 2=api_version_minor(uint32), 3=server_info(string), 4=name(string)
pub struct HelloResponse {
    pub api_version_major: u32,
    pub api_version_minor: u32,
    pub server_info: String,
    pub name: String,
}

pub fn decode_hello_response(data: &[u8]) -> HelloResponse {
    let fields = ProtoFields::decode(data);
    HelloResponse {
        api_version_major: fields.get_varint(1) as u32,
        api_version_minor: fields.get_varint(2) as u32,
        server_info: fields.get_string(3),
        name: fields.get_string(4),
    }
}

/// AuthenticationRequest (msg type 3)
/// Fields: 1=password(string)
pub fn encode_auth_request(password: &str) -> Vec<u8> {
    encode_string_field(1, password)
}

/// DeviceInfoResponse (msg type 10)
/// Fields: 1=uses_password(bool), 2=name(string), 3=mac_address(string),
///         4=esphome_version(string), 5=compilation_time(string), 6=model(string),
///         7=has_deep_sleep(bool), 8=project_name(string), 9=project_version(string),
///         10=webserver_port(uint32), 11=legacy_voice_assistant_version(uint32),
///         12=bluetooth_proxy_feature_flags(uint32), 13=manufacturer(string),
///         14=friendly_name(string)
pub struct DeviceInfoResponse {
    pub name: String,
    pub friendly_name: String,
    pub mac_address: String,
    pub esphome_version: String,
    pub compilation_time: String,
    pub model: String,
    pub manufacturer: String,
}

pub fn decode_device_info_response(data: &[u8]) -> DeviceInfoResponse {
    let fields = ProtoFields::decode(data);
    DeviceInfoResponse {
        name: fields.get_string(2),
        friendly_name: fields.get_string(13),
        mac_address: fields.get_string(3),
        esphome_version: fields.get_string(4),
        compilation_time: fields.get_string(5),
        model: fields.get_string(6),
        manufacturer: fields.get_string(12),
    }
}

/// GetTimeResponse (msg type 37)
/// Fields: 1=epoch_seconds(fixed32)
pub fn encode_get_time_response() -> Vec<u8> {
    use std::time::{SystemTime, UNIX_EPOCH};
    let epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as u32;
    encode_fixed32_field(1, epoch)
}
