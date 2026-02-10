# ESPHome Entity ID Retriever

A Python tool for connecting to ESPHome devices to retrieve device information, list entities, generate REST API endpoints, and test connectivity.

## Features

- Connect to ESPHome devices via the native API
- Display comprehensive device information
- List all entities organized by type
- Generate REST API endpoint documentation
- Test all GET endpoints with live responses
- Support for encrypted connections
- Generate interactive web dashboards (JavaScript or TypeScript)

## Requirements

### Python Libraries

```bash
pip install aioesphomeapi aiohttp
```

Or if using a virtual environment:

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac
pip install aioesphomeapi aiohttp
```

## Usage

### Basic Usage

```bash
python get_ids.py <host> [encryption_key] [password] [port] [--test] [--time] [--js <dir>] [--ts <dir>]
```

### Examples

**Connect to device without encryption:**
```bash
python get_ids.py 192.168.1.100
```

**Connect with encryption key:**
```bash
python get_ids.py 192.168.1.100 "<your-encryption-key>"
```

**Connect with encryption and test endpoints:**
```bash
python get_ids.py 192.168.1.100 "<your-encryption-key>" "" 6053 --test
```

**Using hostname instead of IP:**
```bash
python get_ids.py pool-controller.local "<your-encryption-key>"
```

**Time the execution with summary output:**
```bash
python get_ids.py 192.168.1.100 "<your-encryption-key>" "" 6053 --time
```

**Time the execution with full test results:**
```bash
python get_ids.py 192.168.1.100 "<your-encryption-key>" "" 6053 --time --test
```

**Generate a JavaScript web dashboard:**
```bash
python get_ids.py 192.168.1.100 "<your-encryption-key>" --js ./dashboard
```

**Generate a TypeScript web dashboard:**
```bash
python get_ids.py 192.168.1.100 "<your-encryption-key>" --ts ./dashboard
```

## Parameters

- `host` - IP address or hostname of the ESPHome device (required)
- `encryption_key` - API encryption key from ESPHome (optional, base64 encoded)
- `password` - API password if configured (optional)
- `port` - API port (optional, default: 6053)
- `--test` - Flag to test all GET endpoints after listing (optional)
- `--time` - Flag to time the entire execution and display only summary output (optional)
- `--js <dir>` - Generate a JavaScript web dashboard in the specified directory (optional)
- `--ts <dir>` - Generate a TypeScript web dashboard in the specified directory (optional)

## Output

The script provides four main sections of output:

### 1. Device Information

```
============================================================
DEVICE INFORMATION
============================================================
Name:                esphome-web-abc123
Friendly Name:       My Device
MAC Address:         XX:XX:XX:XX:XX:XX
ESPHome Version:     2025.12.1
Model:               esp32-s3-devkitc-1
============================================================
```

### 2. Entities List

Entities are grouped by type:

```
============================================================
ENTITIES
============================================================

Binary Sensors (10):
  [1320061917] High Current Alarm (high_current_alarm)
  [3598075783] Pump Running (pump_running)
  ...

Sensors (22):
  [1324261225] Uptime (uptime)
  [2391494160] Power (power)
  [799351157] WiFi Signal (wifi_signal)
  ...

Switches (12):
  [2074477625] Waterfall (waterfall)
  [2387790582] Pool Light (pool_light)
  ...
```

### 3. REST API Endpoints

Complete list of REST endpoints with methods and actions:

```
============================================================
REST API ENDPOINTS
============================================================

Base URL: http://192.168.1.100

Sensor (22):
  Uptime
    Endpoint: /sensor/uptime
    Methods:  GET

  Power
    Endpoint: /sensor/power
    Methods:  GET

Switch (12):
  Waterfall
    Endpoint: /switch/waterfall
    Methods:  GET, POST
    Actions:  turn_on, turn_off, toggle

  Pool Light
    Endpoint: /switch/pool_light
    Methods:  GET, POST
    Actions:  turn_on, turn_off, toggle
```

### 4. Endpoint Testing (with --test flag)

When using `--test`, the script tests all GET endpoints:

```
============================================================
TESTING REST ENDPOINTS (GET)
============================================================

Testing 87 GET endpoints...

✓ [Sensor] Uptime
  URL: http://192.168.1.100/sensor/uptime
  Response: {'id': 'sensor-uptime', 'value': 63547.53, 'state': '63548 s'}

✓ [Switch] Waterfall
  URL: http://192.168.1.100/switch/waterfall
  Response: {'id': 'switch-waterfall', 'value': False, 'state': 'OFF'}

✓ [Number] Pump Speed 1
  URL: http://192.168.1.100/number/pump_speed_1
  Response: {'id': 'number-pump_speed_1', 'value': '1450', 'state': '1450'}

============================================================
TEST SUMMARY
============================================================
Total Tested:  87
Successful:    87 ✓
Failed:        0 ✗
============================================================
```

## Web Dashboard Generation

Use `--js` or `--ts` to generate a self-contained interactive web dashboard for controlling your ESPHome device via its REST API.

### JavaScript Output (`--js <dir>`)

Generates a ready-to-use dashboard:
- `index.html` — Interactive dashboard with auto-refresh
- `api.js` — REST API client functions
- `package.json` — With `npm start` to serve via http-server

Open `index.html` directly in a browser, or:
```bash
cd <dir>
npm start
```

### TypeScript Output (`--ts <dir>`)

Generates a TypeScript-based dashboard:
- `index.html` — Interactive dashboard (references compiled `api.js`)
- `api.ts` — Typed REST API client
- `tsconfig.json` — TypeScript configuration (outputs to `dist/`)
- `package.json` — With `npm run build` and `npm run serve`

To build and serve:
```bash
cd <dir>
npm install -g typescript
npm run build    # Compiles api.ts → dist/api.js, copies index.html to dist/
npm run serve    # Builds and serves from dist/ on port 8080
```

### Dashboard Features

- **Grouped by entity type** — Binary Sensors, Sensors, Switches, Buttons, Numbers, Selects, etc.
- **Live state display** — Shows current values for all entities
- **Interactive controls** — Toggle switches, press buttons, set numbers, select options, set times
- **Select dropdowns** — Populated with all available options from the device, automatically synced to current value
- **Auto-refresh** — Toggle automatic polling every 5 seconds
- **Dark theme** — GitHub-inspired dark UI

## Supported Entity Types

The tool recognizes and generates endpoints for:

- **Binary Sensors** - `/binary_sensor/{id}`
- **Sensors** - `/sensor/{id}`
- **Text Sensors** - `/text_sensor/{id}`
- **Switches** - `/switch/{id}`
- **Buttons** - `/button/{id}`
- **Lights** - `/light/{id}`
- **Fans** - `/fan/{id}`
- **Covers** - `/cover/{id}`
- **Climate** - `/climate/{id}`
- **Numbers** - `/number/{id}`
- **Selects** - `/select/{id}`
- **Times** - `/time/{id}`
- **Texts** - `/text/{id}`
- **Locks** - `/lock/{id}`

## Finding Your Encryption Key

The encryption key is found in your ESPHome device's YAML configuration or logs:

```yaml
api:
  encryption:
    key: "<your-base64-encryption-key>"
```

## Troubleshooting

**Connection requires encryption error:**
- Add your device's encryption key as the second parameter

**Module not found:**
- Ensure you've installed required packages: `pip install aioesphomeapi aiohttp`

**Connection timeout:**
- Verify the IP address/hostname is correct
- Ensure the device is on the same network
- Check that port 6053 is not blocked by firewall

## Performance Timing

Use the `--time` flag to measure execution time and reduce output verbosity:

```bash
python get_ids.py 192.168.1.100 "<your-encryption-key>" "" 6053 --time
```

This mode displays only summary statistics:
```
Total Entities: 101
Total REST Endpoints: 101
  GET-capable:  101
  POST-only:    0

Execution Time: 1.669s
```

Combine with `--test` to include test results without per-endpoint details:
```bash
python get_ids.py 192.168.1.100 "<your-encryption-key>" "" 6053 --time --test
```

## Implementations

This tool is available in multiple languages:

- **Python** - [get_ids.py](../get_ids.py) - Original aioesphomeapi implementation
- **Rust** - [Rust/](./Rust/) - Native tokio implementation with improved performance
- **Zig** - [Zig/](./Zig/) - Bare-metal Zig implementation with minimal binary size

See individual implementation folders for language-specific documentation.

## License

This tool is provided as-is for ESPHome device management and development.
