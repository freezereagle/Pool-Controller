//! ESPHome Entity ID Retriever
//!
//! Connects to an ESPHome device via its Native API (port 6053) using Noise protocol
//! encryption (Noise_NNpsk0_25519_ChaChaPoly_SHA256), discovers all entities, and
//! optionally tests REST API endpoints.
//!
//! This is a complete Rust replacement for the Python get_ids.py tool.

mod noise_connection;
mod protobuf;
mod entities;
mod web_gen;

use std::env;
use std::process;
use std::time::Instant;

use entities::EntityInfo;
use noise_connection::NoiseConnection;

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: get_ids <host> [encryption_key] [password] [port] [--test] [--time] [--js <dir>] [--ts <dir>]");
        eprintln!();
        eprintln!("Examples:");
        eprintln!("  get_ids 192.168.1.100");
        eprintln!("  get_ids 192.168.1.100 'base64_encryption_key'");
        eprintln!("  get_ids 192.168.1.100 'base64_encryption_key' mypassword");
        eprintln!("  get_ids 192.168.1.100 'base64_encryption_key' mypassword 6053");
        eprintln!("  get_ids 192.168.1.100 'base64_encryption_key' '' 6053 --test");
        eprintln!("  get_ids 192.168.1.100 'base64_encryption_key' '' 6053 --time");
        eprintln!("  get_ids 192.168.1.100 'base64_encryption_key' --js ./dashboard");
        eprintln!("  get_ids 192.168.1.100 'base64_encryption_key' --ts ./dashboard");
        eprintln!();
        eprintln!("Note: Encryption key is the API encryption key from ESPHome (noise_psk)");
        eprintln!("      Add --test flag to test all GET endpoints");
        eprintln!("      Add --time flag to time execution (summary output only)");
        eprintln!("      Add --js <dir> to generate a JavaScript web dashboard");
        eprintln!("      Add --ts <dir> to generate a TypeScript web dashboard");
        process::exit(1);
    }

    let test_endpoints = args.iter().any(|a| a == "--test");
    let timed = args.iter().any(|a| a == "--time");

    // Parse --js and --ts flags
    let mut web_out = String::new();
    let mut web_lang = String::new();
    let mut filtered: Vec<&String> = Vec::new();
    let mut i = 1;
    while i < args.len() {
        if (args[i] == "--js" || args[i] == "--ts") && i + 1 < args.len() {
            web_lang = if args[i] == "--js" { "js".to_string() } else { "ts".to_string() };
            web_out = args[i + 1].clone();
            i += 2;
        } else if args[i] == "--test" || args[i] == "--time" {
            i += 1;
        } else {
            filtered.push(&args[i]);
            i += 1;
        }
    }

    let host = filtered[0].as_str();
    let encryption_key = if filtered.len() > 1 { filtered[1].as_str() } else { "" };
    let _password = if filtered.len() > 2 { filtered[2].as_str() } else { "" };
    let port: u16 = if filtered.len() > 3 {
        filtered[3].parse().unwrap_or(6053)
    } else {
        6053
    };

    let start = Instant::now();
    match run(host, port, encryption_key, test_endpoints, timed, &web_out, &web_lang).await {
        Ok(_) => {
            if timed {
                let elapsed = start.elapsed();
                println!("\nExecution Time: {:.3}s", elapsed.as_secs_f64());
            }
            process::exit(0);
        }
        Err(e) => {
            if timed {
                let elapsed = start.elapsed();
                println!("\nExecution Time: {:.3}s", elapsed.as_secs_f64());
            }
            eprintln!("Error: {}", e);
            process::exit(1);
        }
    }
}

async fn run(
    host: &str,
    port: u16,
    encryption_key: &str,
    test_endpoints: bool,
    timed: bool,
    web_out: &str,
    web_lang: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    if !timed {
        println!("Connecting to {}:{}...", host, port);
    }

    let mut conn = NoiseConnection::connect(host, port, encryption_key).await?;
    if !timed {
        println!("Connected successfully!\n");
    }

    // Send HelloRequest (msg type 1)
    let hello_req = protobuf::encode_hello_request("esphome-get-ids 0.1.0");
    conn.send_message(1, &hello_req).await?;

    // Read HelloResponse (msg type 2) - handle any interleaved messages
    let hello_resp;
    loop {
        let (msg_type, data) = conn.recv_message().await?;
        if msg_type == 2 {
            hello_resp = protobuf::decode_hello_response(&data);
            break;
        }
        handle_internal_message(&mut conn, msg_type).await?;
    }

    // Send ConnectRequest / AuthenticationRequest (msg type 3)
    // NOTE: With Noise encryption, we do NOT wait for an AuthenticationResponse.
    // The device authenticates via the Noise PSK handshake. Per aioesphomeapi:
    // "Never wait for AuthenticationResponse - the device will either send it
    //  immediately if authentication fails, or not send it at all"
    let auth_req = protobuf::encode_auth_request("");
    conn.send_message(3, &auth_req).await?;

    // Send DeviceInfoRequest (msg type 9) immediately after auth
    conn.send_message(9, &[]).await?;

    // Read DeviceInfoResponse (msg type 10) - handle any interleaved messages
    // (including a possible AuthenticationResponse type 4, which we just skip)
    let device_info;
    loop {
        let (msg_type, data) = conn.recv_message().await?;
        if msg_type == 10 {
            device_info = protobuf::decode_device_info_response(&data);
            break;
        }
        if msg_type == 4 {
            // AuthenticationResponse - check for invalid_password flag
            let fields = protobuf::ProtoFields::decode(&data);
            if fields.get_bool(1) {
                return Err("Authentication failed: invalid password".into());
            }
            continue;
        }
        handle_internal_message(&mut conn, msg_type).await?;
    }

    // Print device info
    if !timed {
        println!("{}", "=".repeat(60));
        println!("DEVICE INFORMATION");
        println!("{}", "=".repeat(60));
        println!("Name:                {}", device_info.name);
        if !device_info.friendly_name.is_empty() {
            println!("Friendly Name:       {}", device_info.friendly_name);
        }
        println!("MAC Address:         {}", device_info.mac_address);
        println!("ESPHome Version:     {}", device_info.esphome_version);
        if !device_info.compilation_time.is_empty() {
            println!("Compilation Time:    {}", device_info.compilation_time);
        }
        if !device_info.model.is_empty() {
            println!("Model:               {}", device_info.model);
        }
        if !device_info.manufacturer.is_empty() {
            println!("Manufacturer:        {}", device_info.manufacturer);
        }
        if !hello_resp.server_info.is_empty() {
            println!("Platform:            {}", hello_resp.server_info);
        }
        println!("{}", "=".repeat(60));
        println!();
    }

    // Send ListEntitiesRequest (msg type 11)
    conn.send_message(11, &[]).await?;

    // Collect entity responses until ListEntitiesDoneResponse (msg type 19)
    let mut all_entities: Vec<EntityInfo> = Vec::new();
    loop {
        let (msg_type, data) = conn.recv_message().await?;

        if msg_type == 19 {
            // ListEntitiesDoneResponse
            break;
        }

        // Handle internal messages (PingRequest, GetTimeRequest, etc.)
        if msg_type == 7 || msg_type == 36 || msg_type == 5 {
            handle_internal_message(&mut conn, msg_type).await?;
            continue;
        }

        if let Some(entity) = entities::parse_entity(msg_type, &data) {
            all_entities.push(entity);
        }
    }

    // Group entities by category
    let groups = entities::group_entities(&all_entities);

    if !timed {
        println!("{}", "=".repeat(60));
        println!("ENTITIES");
        println!("{}", "=".repeat(60));
    }

    let mut total_entities = 0;
    for (group_name, group_entities) in &groups {
        if !group_entities.is_empty() {
            if !timed {
                println!("\n{} ({}):", group_name, group_entities.len());
                let mut sorted = group_entities.clone();
                sorted.sort_by(|a, b| a.display_line().cmp(&b.display_line()));
                for e in &sorted {
                    println!("{}", e.display_line());
                }
            }
            total_entities += group_entities.len();
        }
    }

    if !timed {
        println!();
        println!("{}", "=".repeat(60));
    }
    println!("Total Entities: {}", total_entities);
    if !timed {
        println!("{}", "=".repeat(60));
    }

    // Generate REST endpoints
    if !timed {
        println!();
        println!();
        println!("{}", "=".repeat(60));
        println!("REST API ENDPOINTS");
        println!("{}", "=".repeat(60));
        println!("\nBase URL: http://{}", host);
        println!();
    }

    let rest_endpoints = entities::generate_rest_endpoints(&all_entities);
    let skipped = entities::get_skipped_entities(&all_entities);

    if !skipped.is_empty() && !timed {
        println!();
        println!("{}", "=".repeat(60));
        println!("ENTITIES WITHOUT REST ENDPOINTS ({})", skipped.len());
        println!("{}", "=".repeat(60));
        for item in &skipped {
            println!("  [{}] {} ({})", item.entity_type, item.name, item.object_id);
        }
        println!();
    }

    // Group endpoints by type and print
    let mut endpoint_groups: std::collections::BTreeMap<String, Vec<&entities::RestEndpoint>> =
        std::collections::BTreeMap::new();
    for ep in &rest_endpoints {
        endpoint_groups
            .entry(ep.ep_type.clone())
            .or_default()
            .push(ep);
    }

    if !timed {
        for (ep_type, endpoints) in &endpoint_groups {
            println!("\n{} ({}):", ep_type, endpoints.len());
            let mut sorted = endpoints.clone();
            sorted.sort_by(|a, b| a.object_id.cmp(&b.object_id));
            for ep in &sorted {
                let methods = ep.methods.join(", ");
                println!("\n  {}", ep.entity_name);
                println!("    Endpoint: {}", ep.endpoint);
                println!("    Methods:  {}", methods);
                if !ep.actions.is_empty() {
                    let actions = ep.actions.join(", ");
                    println!("    Actions:  {}", actions);
                }
            }
        }
    }

    if !timed {
        println!();
        println!("{}", "=".repeat(60));
    }
    println!("Total REST Endpoints: {}", rest_endpoints.len());

    let get_count = rest_endpoints
        .iter()
        .filter(|ep| ep.methods.contains(&"GET".to_string()))
        .count();
    let post_only = rest_endpoints
        .iter()
        .filter(|ep| !ep.methods.contains(&"GET".to_string()))
        .count();

    println!("  GET-capable:  {}", get_count);
    println!("  POST-only:    {}", post_only);
    if !timed {
        println!("{}", "=".repeat(60));
        println!();
        println!("Example Usage:");
        println!("  GET  http://{}/sensor/{{sensor_id}}", host);
        println!("  POST http://{}/switch/{{switch_id}}/turn_on", host);
        println!("  POST http://{}/light/{{light_id}}/toggle", host);
        println!();
    }

    // Disconnect gracefully
    conn.send_message(5, &[]).await?; // DisconnectRequest

    // Generate web interface if requested
    if !web_out.is_empty() && !web_lang.is_empty() {
        let dev_name = if !device_info.friendly_name.is_empty() {
            &device_info.friendly_name
        } else {
            &device_info.name
        };
        web_gen::generate(host, dev_name, &rest_endpoints, web_out, web_lang)?;
    }

    // Test endpoints if requested
    if test_endpoints {
        test_rest_endpoints_http(host, &rest_endpoints, timed).await;
    }

    Ok(())
}

/// Handle internal/unsolicited messages (PingRequest, GetTimeRequest, etc.)
/// Returns Ok(()) if the message was handled, Err if it was an unexpected message type.
async fn handle_internal_message(
    conn: &mut NoiseConnection,
    msg_type: u16,
) -> Result<(), Box<dyn std::error::Error>> {
    match msg_type {
        // PingRequest -> PingResponse
        7 => {
            conn.send_message(8, &[]).await?;
            Ok(())
        }
        // GetTimeRequest -> GetTimeResponse
        36 => {
            let time_resp = protobuf::encode_get_time_response();
            conn.send_message(37, &time_resp).await?;
            Ok(())
        }
        // DisconnectRequest
        5 => {
            conn.send_message(6, &[]).await?; // DisconnectResponse
            Err(format!("Device sent DisconnectRequest").into())
        }
        other => {
            // Unknown message - skip it
            eprintln!("Warning: Ignoring unexpected message type {}", other);
            Ok(())
        }
    }
}

async fn test_rest_endpoints_http(host: &str, rest_endpoints: &[entities::RestEndpoint], timed: bool) {
    if !timed {
        println!();
        println!("{}", "=".repeat(60));
        println!("TESTING REST ENDPOINTS (GET)");
        println!("{}", "=".repeat(60));
        println!();
    }

    let get_endpoints: Vec<&entities::RestEndpoint> = rest_endpoints
        .iter()
        .filter(|ep| ep.methods.contains(&"GET".to_string()))
        .collect();

    if get_endpoints.is_empty() {
        println!("No GET endpoints found to test.");
        return;
    }

    if !timed {
        println!("Testing {} GET endpoints...\n", get_endpoints.len());
    }

    let mut success_count = 0u32;
    let mut fail_count = 0u32;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap();

    for ep in &get_endpoints {
        let url = format!("http://{}{}", host, ep.endpoint);
        match client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.text().await {
                        Ok(text) => {
                            if !timed {
                                let display = if let Ok(json) =
                                    serde_json::from_str::<serde_json::Value>(&text)
                                {
                                    format!("{}", json)
                                } else {
                                    text
                                };
                                println!("\u{2713} [{}] {}", ep.ep_type, ep.entity_name);
                                println!("  URL: {}", url);
                                println!("  Response: {}", display);
                            }
                            success_count += 1;
                        }
                        Err(e) => {
                            if !timed {
                                println!("\u{2717} [{}] {} - ERROR", ep.ep_type, ep.entity_name);
                                println!("  URL: {}", url);
                                println!("  Error: {}", e);
                            }
                            fail_count += 1;
                        }
                    }
                } else {
                    if !timed {
                        let status = response.status();
                        let text = response.text().await.unwrap_or_default();
                        println!("\u{2717} [{}] {} - FAILED", ep.ep_type, ep.entity_name);
                        println!("  URL: {}", url);
                        println!("  Status: {}", status);
                        println!("  Response: {}", text);
                    }
                    fail_count += 1;
                }
            }
            Err(e) => {
                if !timed {
                    if e.is_timeout() {
                        println!("\u{2717} [{}] {} - TIMEOUT", ep.ep_type, ep.entity_name);
                        println!("  URL: {}", url);
                        println!("  Error: Request timed out after 5 seconds");
                    } else if e.is_connect() {
                        println!(
                            "\u{2717} [{}] {} - CONNECTION ERROR",
                            ep.ep_type, ep.entity_name
                        );
                        println!("  URL: {}", url);
                        println!("  Error: {}", e);
                    } else {
                        println!("\u{2717} [{}] {} - ERROR", ep.ep_type, ep.entity_name);
                        println!("  URL: {}", url);
                        println!("  Error: {}", e);
                    }
                }
                fail_count += 1;
            }
        }
        if !timed {
            println!();
        }
    }

    if !timed {
        println!("{}", "=".repeat(60));
    }
    println!("TEST SUMMARY");
    if !timed {
        println!("{}", "=".repeat(60));
    }
    println!("Total Tested:  {}", get_endpoints.len());
    println!("Successful:    {} \u{2713}", success_count);
    println!("Failed:        {} \u{2717}", fail_count);
    if !timed {
        println!("{}", "=".repeat(60));
        println!();
    }
}
