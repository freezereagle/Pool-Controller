# Tools Documentation

ESPHome utilities and helper scripts for device management and development.

## Available Tools

### [get_ids.py](get_ids.md)
ESPHome Entity ID Retriever - Connect to ESPHome devices to retrieve device information, list entities, generate REST API endpoints, and test connectivity.

**Key Features:**
- Device information retrieval
- Entity listing and organization
- REST API endpoint documentation
- Live endpoint testing
- Support for encrypted connections

**Quick Start:**
```bash
python get_ids.py <host> [encryption_key] [--test]
```

[View full documentation →](get_ids.md)

---

## Installation

All tools require Python 3.7+ and dependencies can be installed via:

```bash
pip install -r requirements.txt
```

Or install dependencies individually as needed per tool documentation.

