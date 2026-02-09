# get_ids - Rust Implementation

High-performance Rust implementation of the ESPHome Entity ID Retriever, using native Rust async runtime (tokio) and HTTP client with Noise protocol encryption.

## Features

- Fast async/await based implementation using tokio
- Native Rust HTTP client (reqwest)
- Complete Noise protocol encryption support
- Identical functionality to Python and Zig implementations
- Detailed error handling and reporting

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
./target/release/get_ids <host> [encryption_key] [password] [port] [--test] [--time]
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

## Parameters

- `host` - IP address or hostname of the ESPHome device (required)
- `encryption_key` - API encryption key from ESPHome (optional, base64 encoded)
- `password` - API password if configured (optional)
- `port` - API port (optional, default: 6053)
- `--test` - Test all GET endpoints and display responses
- `--time` - Time execution and display only summary output

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

## Source Files

- `src/main.rs` - Main application logic, argument parsing, timing
- `src/noise_connection.rs` - Noise protocol implementation
- `src/protobuf.rs` - Protobuf message encoding/decoding
- `src/entities.rs` - Entity parsing and REST endpoint generation

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
