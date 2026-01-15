# Pool Automation Dashboard - Web Interface

## Quick Start

1. **Build the project:**
   ```bash
   npm install
   npm run build
   ```

2. **Start the web server (development):**
   ```bash
   npm run serve
   ```
   Navigate to `http://localhost:3000`

   **OR build production bundle:**
   ```bash
   npm run build:bundle
   ```
   Serve `build/index.html` from any HTTP server or ESPHome device.

3. **Configure connection:**
   - Enter your ESPHome device IP (default: pool-controller.local)
   - Enter port (default: 80)
   - Optionally enter username/password if authentication is enabled
   - Click "Connect"

## Features

The web dashboard provides a modern, responsive interface for your pool automation system:

### Responsive Design
- 2-column layout on desktop (≥769px)
- Single column on mobile with optimized padding
- Compact header (60% height reduction)
- Material Design Icons throughout

### Pool Light
- Dedicated control section at the top
- Power on/off toggle
- 14 light modes (SAm, Party, Romance, Caribbean, American, Sunset, Royalty, Blue, Green, Red, White, Magenta, Hold, Recall)
- Current mode display

### Temperatures
- Air temperature (°F and °C)
- Water temperature (°F and °C)
- Chlorinator water temperature

### Pump Mode
- Quick mode selection (Auto, Off, Speed 1-5)
- Current mode display

### Schedule Overview
- Glance-style table showing all 5 schedules at a glance
- 12-hour time format with AM/PM
- Schedule status, start time, speed, RPM, and waterfall state
- Pump end time display
- Schedule off status

### Pump Status
- Real-time pump running state
- Current RPM
- Power consumption
- Water flow rate
- Pump pressure (bar)
- Active program/mode
- Time remaining
- Pump clock (formatted)
- Current schedule

### ⚠️ Alarms
- No flow alarm
- Low/High salt alarms
- Clean cell required
- High current, low voltage, low temperature
- Check PCB

### Chlorinator
- Salt level (ppm)
- Status and error codes
- Current output percentage
- Adjustable chlorine output (0-100%)
- Manual refresh

### Pump Speeds
- Configure 5 pump speeds (450-3450 RPM)
- Spinner controls with +/- buttons
- Larger input fields to prevent number truncation

### Switches
- Waterfall control (manual and auto)
- Auto schedule enable/disable
- Takeover mode
- Off switch

### Schedules (Detailed)
- Configure 5 independent schedules
- Set start times
- Select speed for each schedule
- Enable/disable waterfall per schedule
- View schedule status

### Maintenance
- Sync pump clock with system time
- Request pump status update
- Run/Stop pump commands
- Local/Remote control mode switching
- Local program control (Programs 1-4)
- External program control (Programs 1-4)
- Refresh chlorinator data

### 🔄 Auto-Refresh
- Enable automatic data refresh
- Configurable refresh interval (1-60 seconds)

## Production Deployment

### Option 1: Single-File Bundle (Recommended)
Build a minified, single-file HTML bundle:
```bash
npm run build:bundle
```

This creates `build/index.html` (a single 65.8 KB file) with:
- All HTML, CSS, and JavaScript inlined
- No ES6 modules (works without proxy)
- 42.9% size reduction (115.3 KB → 65.8 KB)
- Direct ESPHome connection (no CORS proxy needed)

**Output location:** `web-dashboard/build/index.html`

Serve from any HTTP server:
```bash
cd build
python -m http.server 8080
# Access at http://localhost:8080/index.html
```

### Option 2: Development Server
For development with CORS proxy:
```bash
npm run serve
```
Access at `http://localhost:3000`

### Option 3: Host on ESPHome Device
Upload `build/index.html` to your ESPHome device and serve directly from the device.

## Development

## Development

### Watch mode (auto-rebuild on changes):
```bash
npm run dev
```

### Manual build:
```bash
npm run build
```

### Build production bundle:
```bash
npm run build:bundle
```
Creates `build/index.html` - a single minified file ready for deployment.

## API Usage

The dashboard uses the ESPHome REST API. You can also use the TypeScript client programmatically:

```typescript
import { createClient } from './dist/esphome-api.js';

const client = createClient({
  host: 'pool-controller.local',
  port: 80,
  useProxy: false  // true for dev server, false for direct connection
});

// Get pump status
const running = await client.getPumpRunning();

// Control pool light
await client.setPoolLight(true);

// Set chlorine output
await client.setChlorineOutput(75);

// Get schedule waterfall status
const waterfall = await client.getScheduleWaterfall(1);
```

See [src/examples.ts](src/examples.ts) for more code examples.

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (requires ES2020+ support)

## Troubleshooting

### Connection Issues
- Verify the ESPHome device IP address
- Check that port 80 is accessible
- Ensure the device is on the same network
- Try without username/password first

### CORS Issues
- ESPHome web_server v3 has CORS enabled by default
- For dev server, use `useProxy: true` in client config
- For production bundle, use `useProxy: false` and serve from HTTP server
- Opening `build/index.html` directly from `file://` will cause CORS errors

### Auto-refresh not working
- Check browser console for errors
- Verify the device is still accessible
- Reduce refresh interval if seeing timeout errors

### Pump Speed Numbers Truncated
- Speed input fields have been enlarged (120px width)
- Padding reduced to 6px vertical, 4px horizontal
- If still truncated, try zooming out in browser

## UI Features

### Clickable Status Badge
- Click the "Connected/Disconnected" badge at the top to show/hide configuration
- Configuration auto-hides on successful connection

### Refresh Buttons
- Each section has a Material Design Icon refresh button
- Click to reload data for that specific section
- All sections refresh on initial connection

### Section Order
Sections are ordered by frequency of use:
1. Pool Light (most frequently controlled)
2. Temperatures (monitoring)
3. Pump Mode (quick control)
4. Schedule Overview (at-a-glance status)
5. Detailed sections (Pump Status, Alarms, Chlorinator, etc.)
6. Maintenance and Auto-refresh at the bottom

## Port

Default port: **3000**

To change the port, edit `src/server.ts` and modify the `PORT` constant.
