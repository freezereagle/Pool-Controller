# get_ids - Rust Implementation

High-performance Rust implementation of the ESPHome Entity ID Retriever, using native Rust async runtime (tokio) and HTTP client with Noise protocol encryption.

## Features

- Fast async/await based implementation using tokio
- Native Rust HTTP client (reqwest)
- Complete Noise protocol encryption support
- Identical functionality to Python and Zig implementations
- Detailed error handling and reporting
- Generate interactive web dashboards (JavaScript or TypeScript)

## Building

### Prerequisites

- Rust 1.70+ (install from [rustup.rs](https://rustup.rs/))
- Windows, Linux, or macOS

### Build Instructions

```bash
cd Tools/Rust
cargo build --release
```

The compiled binary will be at: `target/release/get_ids.exe` (Windows) or `target/release/get_ids` (Linux/Mac)

## Usage

### Basic Usage

```bash
./target/release/get_ids <host> [encryption_key] [password] [port] [--test] [--time] [--js <dir>] [--ts <dir>]
```

### Examples

**Connect to device:**
```bash
./target/release/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI="
```

**Test all endpoints:**
```bash
./target/release/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" "" 6053 --test
```

**Time the execution:**
```bash
./target/release/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --time
```

**Time with tests:**
```bash
./target/release/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --time --test
```

**Generate a JavaScript web dashboard:**
```bash
./target/release/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --js ./dashboard
```

**Generate a TypeScript web dashboard:**
```bash
./target/release/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --ts ./dashboard
```

## Parameters

- `host` - IP address or hostname of the ESPHome device (required)
- `encryption_key` - API encryption key from ESPHome (optional, base64 encoded)
- `password` - API password if configured (optional)
- `port` - API port (optional, default: 6053)
- `--test` - Test all GET endpoints and display responses
- `--time` - Time execution and display only summary output
- `--js <dir>` - Generate a JavaScript web dashboard in the specified directory
- `--ts <dir>` - Generate a TypeScript web dashboard in the specified directory

## Performance

Typical execution times on the Pool Controller device:

| Operation | Time |
|-----------|------|
| Device info + entity listing | 0.552s |
| Full test (101 endpoints) | 11.273s |
| Timed test (101 endpoints) | 11.273s |

Binary size: ~3.4 MB (optimized release build)

## Output

### Standard Mode (without --time)

Displays full details including:
- Device information (name, model, version, etc.)
- Organized entity listings by type
- Complete REST API endpoint documentation
- Per-endpoint details (methods, actions, etc.)

### Timed Mode (with --time)

Displays only summary statistics:
```
Total Entities: 101
Total REST Endpoints: 101
  GET-capable:  101
  POST-only:    0

Execution Time: 0.552s
```

### Test Mode (with --test)

- Tests all GET endpoints
- Displays response headers and JSON bodies
- Shows pass/fail summary

### Combined Timed Test (with --time --test)

```
Total Entities: 101
Total REST Endpoints: 101
  GET-capable:  101
  POST-only:    0
TEST SUMMARY
Total Tested:  101
Successful:    101 ✓
Failed:        0 ✗

Execution Time: 11.273s
```

## Web Dashboard Generation

Use `--js` or `--ts` to generate a self-contained interactive web dashboard.

### JavaScript Output (`--js <dir>`)

Generates:
- `index.html` — Interactive dashboard with auto-refresh
- `api.js` — REST API client functions
- `package.json` — With `npm start` to serve via http-server

### TypeScript Output (`--ts <dir>`)

Generates:
- `index.html` — Dashboard (references compiled `api.js`)
- `api.ts` — Typed REST API client
- `tsconfig.json` — TypeScript config (outputs to `dist/`)
- `package.json` — With `npm run build` and `npm run serve`

To build and serve the TypeScript version:
```bash
cd <dir>
npm install -g typescript
npm run build    # Compiles api.ts → dist/api.js, copies index.html to dist/
npm run serve    # Builds and serves from dist/ on port 8080
```

### Dashboard Features

- Grouped by entity type with live state display
- Interactive controls (toggle, press, set values, select options, set times)
- Select dropdowns populated with available options and synced to current value
- Auto-refresh toggle (5-second interval)
- Dark theme UI

## Source Files

- `src/main.rs` - Main application logic, argument parsing, timing
- `src/noise_connection.rs` - Noise protocol implementation
- `src/protobuf.rs` - Protobuf message encoding/decoding
- `src/entities.rs` - Entity parsing and REST endpoint generation
- `src/web_gen.rs` - Web dashboard HTML/JS/TS generation

## Troubleshooting

**Compilation errors:**
- Ensure Rust is installed: `rustup update`
- Check that you're in the Rust directory: `cd Tools/Rust`

**Connection refused:**
- Verify the IP address and port are correct
- Ensure the ESPHome device is reachable: `ping <host>`
- Check that port 6053 is not blocked by firewall

**Encryption error:**
- Verify the encryption key matches your device's configuration
- The key should be base64 encoded

## Comparison with Other Implementations

| Aspect | Python | Rust | Zig |
|--------|--------|------|-----|
| Speed | 1.67s | 0.55s | 0.39s |
| Binary Size | N/A | 3.4 MB | 1.4 MB |
| Dependencies | aioesphomeapi | tokio, snow | stdlib only |
| Startup Time | Slower | Fast | Very Fast |

## License

This implementation is provided as-is for ESPHome device management and development.
