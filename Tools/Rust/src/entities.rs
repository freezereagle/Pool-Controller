//! Entity parsing, grouping, and REST endpoint generation.
//!
//! Maps ESPHome protobuf message types to entity categories, parses the common
//! entity fields (object_id, key, name), and generates REST API endpoint URLs.

use crate::protobuf::ProtoFields;

/// Represents a discovered entity from the ESPHome device.
#[derive(Debug, Clone)]
pub struct EntityInfo {
    pub entity_type: String,    // e.g., "BinarySensor", "Sensor", "Switch"
    pub object_id: String,
    pub key: u32,
    pub name: String,
    pub options: Vec<String>,   // Select options (field 6), empty for non-Select entities
}

impl EntityInfo {
    pub fn display_line(&self) -> String {
        format!("  [{}] {} ({})", self.key, self.name, self.object_id)
    }
}

/// Represents a REST API endpoint.
#[derive(Debug, Clone)]
pub struct RestEndpoint {
    pub ep_type: String,
    pub entity_name: String,
    pub object_id: String,
    pub methods: Vec<String>,
    pub endpoint: String,
    pub actions: Vec<String>,
    pub options: Vec<String>,   // Select options, empty for non-Select
}

/// Represents a skipped entity (no REST endpoint mapping).
#[derive(Debug, Clone)]
pub struct SkippedEntity {
    pub entity_type: String,
    pub name: String,
    pub object_id: String,
}

/// Map ESPHome message type numbers to entity type names.
/// Based on the MESSAGE_TYPE_TO_PROTO mapping in aioesphomeapi/core.py
fn msg_type_to_entity_type(msg_type: u16) -> Option<&'static str> {
    match msg_type {
        12 => Some("BinarySensor"),
        13 => Some("Cover"),
        14 => Some("Fan"),
        15 => Some("Light"),
        16 => Some("Sensor"),
        17 => Some("Switch"),
        18 => Some("TextSensor"),
        43 => Some("Camera"),
        46 => Some("Climate"),
        49 => Some("Number"),
        52 => Some("Select"),
        55 => Some("Siren"),
        58 => Some("Lock"),
        61 => Some("Button"),
        63 => Some("MediaPlayer"),
        94 => Some("AlarmControlPanel"),
        97 => Some("Text"),
        100 => Some("Date"),
        103 => Some("Time"),
        107 => Some("Event"),
        109 => Some("Valve"),
        112 => Some("DateTime"),
        116 => Some("Update"),
        132 => Some("WaterHeater"),
        135 => Some("Infrared"),
        _ => None,
    }
}

/// Parse a protobuf entity response message into an EntityInfo.
///
/// All entity info responses share a common base:
///   field 1: object_id (string)
///   field 2: key (fixed32)
///   field 3: name (string)
pub fn parse_entity(msg_type: u16, data: &[u8]) -> Option<EntityInfo> {
    let entity_type = msg_type_to_entity_type(msg_type)?;
    let fields = ProtoFields::decode(data);

    // For Select entities (msg_type 52), extract options from field 6
    let options = if msg_type == 52 {
        fields.strings.get(&6).cloned().unwrap_or_default()
    } else {
        Vec::new()
    };

    Some(EntityInfo {
        entity_type: entity_type.to_string(),
        object_id: fields.get_string(1),
        key: fields.get_fixed32(2),
        name: fields.get_string(3),
        options,
    })
}

/// Group entities into named categories matching the Python tool's output.
///
/// Returns groups in a stable order using Vec of tuples.
pub fn group_entities(entities: &[EntityInfo]) -> Vec<(String, Vec<&EntityInfo>)> {
    let group_names = [
        "Binary Sensors",
        "Sensors",
        "Switches",
        "Buttons",
        "Lights",
        "Fans",
        "Covers",
        "Climate",
        "Numbers",
        "Selects",
        "Text Sensors",
        "Locks",
        "Media Players",
        "Cameras",
        "Other",
    ];

    let mut groups: Vec<(String, Vec<&EntityInfo>)> = group_names
        .iter()
        .map(|name| (name.to_string(), Vec::new()))
        .collect();

    for entity in entities {
        let group_idx = match entity.entity_type.as_str() {
            "BinarySensor" => 0,
            "Sensor" => 1,
            "Switch" => 2,
            "Button" => 3,
            "Light" => 4,
            "Fan" => 5,
            "Cover" => 6,
            "Climate" => 7,
            "Number" => 8,
            "Select" => 9,
            "TextSensor" => 10,
            "Lock" => 11,
            "MediaPlayer" => 12,
            "Camera" => 13,
            _ => 14, // Other
        };
        groups[group_idx].1.push(entity);
    }

    groups
}

/// Generate REST API endpoints for all entities.
pub fn generate_rest_endpoints(entities: &[EntityInfo]) -> Vec<RestEndpoint> {
    let mut endpoints = Vec::new();

    for entity in entities {
        let ep = match entity.entity_type.as_str() {
            "BinarySensor" => Some(RestEndpoint {
                ep_type: "Binary Sensor".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string()],
                endpoint: format!("/binary_sensor/{}", entity.object_id),
                actions: vec![],
                options: vec![],
            }),
            "TextSensor" => Some(RestEndpoint {
                ep_type: "Text Sensor".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string()],
                endpoint: format!("/text_sensor/{}", entity.object_id),
                actions: vec![],
                options: vec![],
            }),
            "Sensor" => Some(RestEndpoint {
                ep_type: "Sensor".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string()],
                endpoint: format!("/sensor/{}", entity.object_id),
                actions: vec![],
                options: vec![],
            }),
            "Switch" => Some(RestEndpoint {
                ep_type: "Switch".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                endpoint: format!("/switch/{}", entity.object_id),
                actions: vec![
                    "turn_on".to_string(),
                    "turn_off".to_string(),
                    "toggle".to_string(),
                ],
                options: vec![],
            }),
            "Light" => Some(RestEndpoint {
                ep_type: "Light".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                endpoint: format!("/light/{}", entity.object_id),
                actions: vec![
                    "turn_on".to_string(),
                    "turn_off".to_string(),
                    "toggle".to_string(),
                ],
                options: vec![],
            }),
            "Button" => Some(RestEndpoint {
                ep_type: "Button".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                endpoint: format!("/button/{}", entity.object_id),
                actions: vec!["press".to_string()],
                options: vec![],
            }),
            "Fan" => Some(RestEndpoint {
                ep_type: "Fan".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                endpoint: format!("/fan/{}", entity.object_id),
                actions: vec![
                    "turn_on".to_string(),
                    "turn_off".to_string(),
                    "toggle".to_string(),
                ],
                options: vec![],
            }),
            "Cover" => Some(RestEndpoint {
                ep_type: "Cover".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                endpoint: format!("/cover/{}", entity.object_id),
                actions: vec![
                    "open".to_string(),
                    "close".to_string(),
                    "stop".to_string(),
                ],
                options: vec![],
            }),
            "Climate" => Some(RestEndpoint {
                ep_type: "Climate".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                endpoint: format!("/climate/{}", entity.object_id),
                actions: vec!["set mode, temperature".to_string()],
                options: vec![],
            }),
            "Number" => Some(RestEndpoint {
                ep_type: "Number".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                endpoint: format!("/number/{}", entity.object_id),
                actions: vec!["set value".to_string()],
                options: vec![],
            }),
            "Select" => Some(RestEndpoint {
                ep_type: "Select".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                endpoint: format!("/select/{}", entity.object_id),
                actions: vec!["set option".to_string()],
                options: entity.options.clone(),
            }),
            "Lock" => Some(RestEndpoint {
                ep_type: "Lock".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                endpoint: format!("/lock/{}", entity.object_id),
                actions: vec!["lock".to_string(), "unlock".to_string()],
                options: vec![],
            }),
            "Time" => Some(RestEndpoint {
                ep_type: "Time".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                endpoint: format!("/time/{}", entity.object_id),
                actions: vec!["set time".to_string()],
                options: vec![],
            }),
            "Text" => Some(RestEndpoint {
                ep_type: "Text".to_string(),
                entity_name: entity.name.clone(),
                object_id: entity.object_id.clone(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                endpoint: format!("/text/{}", entity.object_id),
                actions: vec!["set text".to_string()],
                options: vec![],
            }),
            _ => None,
        };

        if let Some(endpoint) = ep {
            endpoints.push(endpoint);
        }
    }

    endpoints
}

/// Get entities that don't have REST endpoint mappings.
pub fn get_skipped_entities(entities: &[EntityInfo]) -> Vec<SkippedEntity> {
    let has_rest = [
        "BinarySensor",
        "TextSensor",
        "Sensor",
        "Switch",
        "Light",
        "Button",
        "Fan",
        "Cover",
        "Climate",
        "Number",
        "Select",
        "Lock",
        "Time",
        "Text",
    ];

    entities
        .iter()
        .filter(|e| !has_rest.contains(&e.entity_type.as_str()))
        .map(|e| SkippedEntity {
            entity_type: e.entity_type.clone(),
            name: e.name.clone(),
            object_id: e.object_id.clone(),
        })
        .collect()
}
