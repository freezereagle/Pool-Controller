# get_ids - Zig Implementation

Ultra-fast, minimal-footprint Zig implementation of the ESPHome Entity ID Retriever. Built with Zig 0.15, featuring bare-metal Noise protocol implementation and efficient HTTP client.

## Features

- Blazing-fast execution (0.39s vs 1.67s Python)
- Minimal binary size (1.4 MB vs 3.4 MB Rust)
- Bare-metal Noise protocol implementation
- Zero external dependencies (stdlib only)
- Memory-efficient implementation
- Identical functionality to Python and Rust implementations
- Generate interactive web dashboards (JavaScript or TypeScript)

## Building

### Prerequisites

- Zig 0.15.2 ([download](https://ziglang.org/download/))
- Windows, Linux, or macOS

### Build Instructions

```bash
cd Tools/Zig
zig build -Doptimize=ReleaseFast
```

The compiled binary will be at: `zig-out/bin/get_ids.exe` (Windows) or `zig-out/bin/get_ids` (Linux/Mac)

## Usage

### Basic Usage

```bash
./zig-out/bin/get_ids <host> [encryption_key] [password] [port] [--test] [--time] [--js <dir>] [--ts <dir>]
```

### Examples

**Connect to device:**
```bash
./zig-out/bin/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI="
```

**Test all endpoints:**
```bash
./zig-out/bin/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" "" 6053 --test
```

**Time the execution:**
```bash
./zig-out/bin/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --time
```

**Time with tests:**
```bash
./zig-out/bin/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --time --test
```

**Generate a JavaScript web dashboard:**
```bash
./zig-out/bin/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --js ./dashboard
```

**Generate a TypeScript web dashboard:**
```bash
./zig-out/bin/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --ts ./dashboard
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

Zig implementation provides the best performance of all three implementations:

| Operation | Time |
|-----------|------|
| Device info + entity listing | 0.392s |
| Full test (101 endpoints) | 11.590s |
| Timed test (101 endpoints) | 11.590s |

Binary size: ~1.4 MB (optimized release build)

Speedup vs Python: **4.3x faster** for basic operation, **1.1x faster** for endpoint testing

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

Execution Time: 0.392s
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

Execution Time: 11.590s
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

- `src/main.zig` - Complete implementation including:
  - Noise protocol encryption (25519, ChaCha20-Poly1305, SHA256)
  - Protobuf message encoding/decoding
  - HTTP client using std.http.Client
  - Entity parsing and REST endpoint generation
  - Device information retrieval
  - Endpoint testing framework
  - Performance timing
  - Web dashboard HTML/JS/TS generation

## Implementation Details

### Noise Protocol

Full implementation of `Noise_NNpsk0_25519_ChaChaPoly_SHA256`:
- X25519 key agreement
- ChaCha20-Poly1305 AEAD cipher
- SHA256 hash function
- Pre-shared key (PSK) support

### HTTP Client

- Raw socket connection with custom buffering
- Persistent connection management
- Streaming response handling
- JSON response parsing

### Memory Management

- Stack-based allocation where possible
- Arena allocator for dynamic data
- Careful lifetime management

## Troubleshooting

**Build errors:**
- Ensure Zig 0.15.2 is installed: `zig version`
- Run from the `Tools/Zig` directory

**Runtime errors:**

"expected type '*time.Timer'" or similar - This typically indicates the binary wasn't rebuilt after Zig installation. Rebuild with:
```bash
zig build -Doptimize=ReleaseFast
```

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
| Speed | 1.67s | 0.55s | **0.39s** |
| Binary Size | N/A | 3.4 MB | **1.4 MB** |
| Dependencies | aioesphomeapi | tokio, snow | **stdlib only** |
| Startup Time | Slower | Fast | **Very Fast** |
| Code Size | 488 lines | ~430 lines | 1118 lines |
| Compile Time | N/A | ~12s | ~20s |

## Why Zig?

Zig was chosen for this implementation due to:

1. **Performance** - Compiles to native machine code with zero runtime overhead
2. **Minimal Footprint** - No dependency on external crates or libraries
3. **Control** - Direct access to network and cryptography primitives
4. **Learning** - Demonstrates bare-metal Noise protocol and HTTP implementation
5. **Reproducibility** - Build from standard library only

## License

This implementation is provided as-is for ESPHome device management and development.
