# Pool Automation Web Dashboard

A modern, responsive web interface for ESPHome Pool Automation system with full TypeScript REST API client.

## Features

### Web Dashboard
- 🌊 Modern responsive interface with Material Design Icons
- 📱 Mobile-optimized layout with 2-column desktop view
- 💡 Dedicated pool light controls with mode selection
- 🌡️ Real-time temperature monitoring
- 🔄 Live pump status and control
- 📅 Schedule overview table (glance-style)
- ⚙️ Complete pump speed configuration
- 🧪 Chlorinator monitoring and control
- 🔌 Switch controls for waterfall and automation
- 📊 System information display
- ⏰ Auto-refresh with configurable interval
- 🎨 Clean, card-based layout
- 🔐 Authentication support

### TypeScript API Client
- ✅ Complete TypeScript type definitions for all 86 entities
- ✅ REST API client for ESPHome devices
- ✅ Get/Set operations for all entity types:
  - Binary Sensors (10)
  - Sensors (22)
  - Switches (12)
  - Buttons (2)
  - Text Sensors (20)
  - Numbers (7)
  - Time (6)
  - Text (1)
  - Select (6)
- ✅ Grouped operations (temperatures, pump metrics, chlorinator metrics, etc.)
- ✅ State monitoring with polling
- ✅ CORS proxy server for development
- ✅ Full examples included

## Installation

```bash
npm install
```

## Build

```bash
# Build TypeScript API
npm run build

# Build single-file production bundle
npm run build:bundle
```

The `build:bundle` command creates a minified, single-file HTML bundle in `build/index.html` that:
- Combines HTML, CSS, and JavaScript
- Removes ES6 modules (no proxy needed)
- Reduces size by ~40% (81.3 KB → 48.9 KB)
- Can be served from any web server or ESPHome device

## Development Server

```bash
# Start development server with CORS proxy
npm run serve
```

Access at `http://localhost:3000`

The dev server includes a CORS proxy at `/api/proxy/*` to avoid cross-origin issues during development.

## Production Deployment

### Option 1: Serve Bundled File
Serve `build/index.html` from any HTTP server:
```bash
cd build
python -m http.server 8080
```

### Option 2: Host on ESPHome Device
Upload `build/index.html` to your ESPHome device and serve it directly.

### Option 3: Use Development Server
Run `npm run serve` and access via `http://localhost:3000`

## Web Dashboard Usage

1. **Connect**: Enter ESPHome device IP, port, and credentials
2. **View Status**: Monitor temperatures, pump status, and alarms
3. **Control**: 
   - Toggle pool light and waterfall
   - Set pump mode (Auto/Off/Speed 1-5)
   - Adjust chlorine output
   - Configure pump speeds (450-3450 RPM)
   - Set schedules with times, speeds, and waterfall settings
4. **Monitor**: Enable auto-refresh for live updates

### Dashboard Features

#### Pool Light Section
- Power on/off toggle
- Mode selection (14 modes including SAm, Party, Romance, Caribbean, American, Sunset, Royalty, Blue, Green, Red, White, Magenta, Hold, Recall)
- Current mode display

#### Temperatures
- Air temperature
- Water temperature  
- Chlorinator temperature

#### Pump Mode
- Quick mode selection (Auto, Off, Speed 1-5)
- Current mode display

#### Schedule Overview
- Glance-style table showing all 5 schedules
- 12-hour time format
- Schedule status, start time, speed, RPM, and waterfall state
- Pump end time display
- Schedule off status

#### Responsive Layout
- **Desktop (≥769px)**: 2-column grid layout
- **Mobile (<769px)**: Single column, optimized padding
- Reduced header height for more content space
- Material Design Icons for all refresh buttons

## API Client Usage

### Basic Example

```typescript
import { createClient } from './esphome-api';

const client = createClient({
  host: 'pool-controller.local',
  port: 80,
  username: 'your-username',
  password: 'your-password',
  useProxy: false, // true for dev server, false for direct connection
});

// Get pump status
const pumpRunning = await client.getPumpRunning();
console.log(`Pump Running: ${pumpRunning}`);

// Get temperatures
const temps = await client.getTemperatures();
console.log(`Water Temperature: ${temps.waterTemperatureF}°F`);

// Control pool light
await client.setPoolLight(true);

// Set chlorine output
await client.setChlorineOutput(75);
```

### Monitor State Changes

```typescript
const stopMonitoring = await client.monitorState((state) => {
  console.log(`Pump: ${state.pumpRunning}, RPM: ${state.pumpRpm}`);
}, 5000);

// Stop monitoring when done
stopMonitoring();
```

### Configure Schedules

```typescript
// Set schedule 1
await client.setScheduleStartTime(1, '08:00:00');
await client.setScheduleSpeed(1, 'Speed 2');
await client.setPumpSpeed(2, 2200);
await client.setScheduleWaterfall(1, true);
```

### Get Complete State

```typescript
const state = await client.getCompleteState();
console.log(state);
```

## Entity Types

### Binary Sensors
- Pump status and running state
- Alarms (no flow, low/high salt, clean cell, high current, low voltage, low temp, check PCB)

### Sensors
- Temperatures (air, water, chlorinator)
- Pump metrics (RPM, power, flow, time remaining, clock)
- Chlorinator metrics (salt level, status, error, output)
- Schedule RPMs
- WiFi signal, uptime

### Switches
- Waterfall (manual and auto)
- Pool light
- Auto schedule
- Schedule waterfalls (1-5)
- Takeover mode
- Off switch

### Numbers
- Pump speeds (1-5)
- Chlorine output (0-100%)
- Pump speed test

### Selects
- Pump mode (Auto, Off, Speed 1-5)
- Schedule speeds (1-5)

### Time
- Schedule start times (1-5)
- Pump end time

### Buttons
- Sync pump clock
- Refresh chlorinator

### Text Sensors
- System info (ESPHome version, SSID, IP)
- Schedule statuses
- Chlorinator version and debug info
- Pool light status
- UI labels

## API Methods

### Binary Sensors
- `getBinarySensor(id)` - Get any binary sensor
- `getPumpRunning()` - Get pump running state
- `getPumpStatus()` - Get pump status
- `getAlarmStates()` - Get all alarm states

### Sensors
- `getSensor(id)` - Get any sensor
- `getTemperatures()` - Get all temperature readings
- `getPumpMetrics()` - Get pump RPM, power, flow, etc.
- `getChlorinatorMetrics()` - Get chlorinator metrics
- `getScheduleRpms()` - Get all schedule RPM values

### Switches
- `getSwitch(id)` - Get switch state
- `setSwitch(id, state)` - Set switch on/off
- `toggleSwitch(id)` - Toggle switch
- `setWaterfall(state)` - Control waterfall
- `setPoolLight(state)` - Control pool light
- `setAutoSchedule(state)` - Enable/disable auto schedule
- `setScheduleWaterfall(num, state)` - Control schedule waterfall

### Numbers
- `getNumber(id)` - Get number value
- `setNumber(id, value)` - Set number value
- `setPumpSpeed(num, rpm)` - Set pump speed (450-3450 RPM)
- `setChlorineOutput(percent)` - Set chlorine output (0-100%)

### Selects
- `getSelect(id)` - Get select value
- `setSelect(id, option)` - Set select option
- `setMode(mode)` - Set pump mode
- `setScheduleSpeed(num, speed)` - Set schedule speed

### Buttons
- `pressButton(id)` - Press any button
- `syncPumpClock()` - Sync pump clock
- `refreshChlorinator()` - Refresh chlorinator

### Time
- `getTime(id)` - Get time value
- `setTime(id, time)` - Set time (HH:MM:SS format)
- `setScheduleStartTime(num, time)` - Set schedule start time
- `setPumpEndTime(time)` - Set pump end time

### Text Sensors
- `getTextSensor(id)` - Get text sensor value
- `getSystemInfo()` - Get ESPHome version, SSID, IP
- `getScheduleStatuses()` - Get all schedule status info

### Complete State
- `getCompleteState()` - Get all entity states at once
- `monitorState(callback, interval)` - Poll for state changes

## Examples

See [src/examples.ts](src/examples.ts) for comprehensive examples including:
- Getting pool status
- Controlling pool light
- Setting chlorine levels
- Configuring pump schedules
- Setting pump modes
- Monitoring state changes
- Maintenance operations

## ESPHome Device Configuration

This client is designed for the Pool Automation system at:
- **Device**: pool-controller
- **Default IP**: pool-controller.local
- **Model**: esp32-s3-devkitc-1
- **ESPHome Version**: 2025.11.5

## Development

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Build TypeScript
npm run build

# Build production bundle
npm run build:bundle

# Start dev server with CORS proxy
npm run serve
```

## Project Structure

```
web-dashboard/
├── src/
│   ├── esphome-api.ts      # TypeScript API client
│   ├── types.ts             # Type definitions
│   ├── examples.ts          # Usage examples
│   └── server.ts            # Dev server with CORS proxy
├── public/
│   ├── index.html           # Dashboard UI
│   ├── app.js              # Frontend JavaScript
│   └── styles.css          # Responsive styles
├── dist/                    # Compiled TypeScript output
├── build/                   # Production bundle output
│   └── index.html          # Single-file minified bundle
├── build-bundle.js          # Build script for production bundle
└── package.json
```

## Browser Compatibility

- Modern browsers with ES6+ support
- Fetch API required
- Tested on Chrome, Edge, Firefox

## ESPHome Device Configuration

This client is designed for the Pool Automation system at:
- **Device**: pool-controller
- **Default IP**: pool-controller.local
- **Model**: esp32-s3-devkitc-1
- **ESPHome Version**: 2025.11.5

### Required ESPHome Configuration

```yaml
web_server:
  port: 80
  version: 3
  auth:
    username: "your-username"
    password: "your-password"
```

## Troubleshooting

### CORS Errors
If you see CORS-related errors when connecting:
1. For dev server, use `useProxy: true` in client config
2. For production bundle, use `useProxy: false` and serve from an HTTP server
3. ESPHome web_server v3 has CORS enabled by default

### Connection Failed
- Verify ESPHome device IP address and port
- Check authentication credentials
- Ensure device is on the same network (or reachable)
- Verify ESPHome web server is enabled

### Build Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

## License

MIT
