# Tools Documentation

ESPHome utilities and helper scripts for device management and development.

## Available Tools

### [get_ids](get_ids.md) - ESPHome Entity ID Retriever

Connect to ESPHome devices to retrieve device information, list entities, generate REST API endpoints, and test connectivity.

**Key Features:**
- Device information retrieval
- Entity listing and organization by type
- REST API endpoint documentation
- Live endpoint testing with response inspection
- Support for encrypted connections (Noise protocol)
- Performance timing with `--time` flag
- Interactive web dashboard generation (`--js` or `--ts`)
- Available in three implementations: Python, Rust, and Zig

**Quick Start:**
```bash
# Python (original implementation)
python get_ids.py <host> [encryption_key] [--test] [--time] [--js <dir>] [--ts <dir>]

# Rust (high-performance native implementation)
./Rust/target/release/get_ids <host> [encryption_key] [--test] [--time] [--js <dir>] [--ts <dir>]

# Zig (ultra-fast, minimal binary)
./Zig/zig-out/bin/get_ids <host> [encryption_key] [--test] [--time] [--js <dir>] [--ts <dir>]
```

#### Implementation Comparison

| Implementation | Speed | Binary Size | Dependencies | Best For |
|---|---|---|---|---|
| [Python](get_ids.md) | 1.67s | N/A | aioesphomeapi, aiohttp | Development, flexibility |
| [Rust](Rust/get_ids.md) | 0.55s | 3.4 MB | tokio, snow | Production, balance |
| [Zig](Zig/get_ids.md) | 0.39s | 1.4 MB | stdlib only | Performance, minimal deps |

**Documentation:**
- [Main documentation](get_ids.md)
- [Rust implementation](Rust/get_ids.md)
- [Zig implementation](Zig/get_ids.md)

---

## Installation

### Python Implementation

All tools require Python 3.7+ and dependencies can be installed via:

```bash
pip install -r requirements.txt
```

Or install dependencies individually as needed per tool documentation.

### Rust Implementation

Requires Rust 1.70+:

```bash
cd Rust
cargo build --release
```

### Zig Implementation

Requires Zig 0.15.2+:

```bash
cd Zig
zig build -Doptimize=ReleaseFast
```

---

## Tool Usage Summary

### Basic Connection (all implementations)
```bash
# Python
python get_ids.py 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI="

# Rust
./Rust/target/release/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI="

# Zig
./Zig/zig-out/bin/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI="
```

### Test Endpoints (all implementations)
```bash
# Python
python get_ids.py 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --test

# Rust
./Rust/target/release/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --test

# Zig
./Zig/zig-out/bin/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --test
```

### Performance Testing (all implementations)
```bash
# Python with timing
python get_ids.py 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --time

# Rust with timing
./Rust/target/release/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --time

# Zig with timing
./Zig/zig-out/bin/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --time
```

### Web Dashboard Generation (all implementations)
```bash
# Generate JavaScript dashboard
python get_ids.py 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --js ./dashboard
./Rust/target/release/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --js ./dashboard
./Zig/zig-out/bin/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --js ./dashboard

# Generate TypeScript dashboard
python get_ids.py 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --ts ./dashboard
./Rust/target/release/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --ts ./dashboard
./Zig/zig-out/bin/get_ids 192.168.68.79 "xcT/ahb5GdXPpbOb0irwnhUXPFD5H5JQPf6D+rmaUUI=" --ts ./dashboard

# Build and serve TypeScript dashboard
cd ./dashboard
npm install -g typescript
npm run build
npm run serve
```

---

## Troubleshooting

### Python Issues
- Module not found: `pip install aioesphomeapi aiohttp`
- Connection timeout: Verify device IP and firewall settings

### Rust Issues
- Compilation failed: Ensure Rust is updated: `rustup update`
- Connection errors: Check network connectivity to device

### Zig Issues
- Build errors: Ensure Zig 0.15.2+ is installed: `zig version`
- Compilation timeout: Try `zig build` without optimization

See individual implementation documentation for detailed troubleshooting.

