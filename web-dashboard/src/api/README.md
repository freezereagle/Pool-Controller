# Modular API Structure

The ESPHome Pool Automation API has been refactored into separate, focused modules for better organization and maintainability.

## Module Overview

### `api/base.ts`
Core HTTP client functionality used by all modules.
- `BaseESPHomeClient` - Base class with request/auth handling
- `ESPHomeConfig` - Configuration interface

### `api/pool-light.ts`
**Pool Light Control**
- Power on/off
- 14 light modes (SAm, Party, Romance, etc.)
- Mode selection and status

### `api/temperature.ts`
**Temperature Monitoring** (Non-chlorinator)
- Air temperature (°C and °F)
- Water temperature (°C and °F)

### `api/pump.ts`
**Pool Pump Operations**
- Pump status and metrics (RPM, power, flow, pressure)
- Active program/mode monitoring
- Mode control (Auto, Off, Speed 1-5)
- Speed configuration (450-3450 RPM)
- Schedule management (5 schedules with times, speeds, waterfall)
- Waterfall controls
- Pump clock sync
- Takeover mode
- Pump control buttons (run, stop, request status)
- Local/remote control switching
- Local and external program execution (Programs 1-4)

### `api/chlorinator.ts`
**Chlorinator Management**
- Salt level monitoring
- Chlorinator temperature
- Status and error codes
- Output control (0-100%)
- Alarm states (low/high salt, clean cell, etc.)
- Version and debug info
- Manual refresh

### `api/index.ts`
**Unified Client**
- `PoolAutomationClient` - Combines all modules
- `createPoolClient()` - Factory function

## Usage

### Using the Unified Client (Recommended)

```typescript
import { createPoolClient } from './api/index.js';

const pool = createPoolClient({
  host: 'pool-controller.local',
  port: 80,
  username: 'admin',
  password: 'password',
  useProxy: false
});

// Access each subsystem
await pool.light.setPoolLight(true);
await pool.light.setLightMode('Party');

const temps = await pool.temperature.getTemperatures();
console.log(`Water: ${temps.waterTemperatureF}°F`);

await pool.pump.setMode('Speed 2');
await pool.pump.setScheduleStartTime(1, '08:00:00');

await pool.chlorinator.setChlorineOutput(75);
const metrics = await pool.chlorinator.getChlorinatorMetrics();

// Get complete status from all subsystems
const status = await pool.getCompleteStatus();
```

### Using Individual Modules

```typescript
import { PoolLightAPI } from './api/pool-light.js';
import { TemperatureAPI } from './api/temperature.js';

const config = {
  host: 'pool-controller.local',
  useProxy: false
};

const lightAPI = new PoolLightAPI(config);
await lightAPI.setPoolLight(true);
await lightAPI.setLightMode('Caribbean');

const tempAPI = new TemperatureAPI(config);
const temps = await tempAPI.getTemperatures();
```

## Benefits of Modular Structure

```
api/index.ts (Unified Client)
    ├── api/pool-light.ts
    ├── api/temperature.ts
    ├── api/pump.ts
    ├── api/chlorinator.ts
    └── api/base.ts (shared by all)
```

All modules extend `BaseESPHomeClient` for consistent HTTP handling and authentication.
