/**
 * Example usage of the ESPHome Pool Automation API
 * Using the new modular API structure
 */

import { createPoolClient } from './api/index.js';

// Example configuration
const pool = createPoolClient({
  host: 'pool-controller.local', // Replace with your ESPHome device IP
  port: 80,
  username: 'REDACTED', // Optional: Replace with your credentials
  password: 'REDACTED',
});

/**
 * Example 1: Get current pool status
 */
async function getPoolStatus() {
  console.log('=== Pool Status ===');

  // Get pump status
  const pumpRunning = await pool.pump.getPumpRunning();
  console.log(`Pump Running: ${pumpRunning}`);

  // Get temperatures
  const temps = await pool.temperature.getTemperatures();
  console.log(`Air Temperature: ${temps.airTemperatureF}°F`);
  console.log(`Water Temperature: ${temps.waterTemperatureF}°F`);

  // Get pump metrics
  const pumpMetrics = await pool.pump.getPumpMetrics();
  console.log(`Pump RPM: ${pumpMetrics.pumpRpm}`);
  console.log(`Power: ${pumpMetrics.power}W`);
  console.log(`Flow: ${pumpMetrics.flowM3H} m³/h`);

  // Get chlorinator metrics
  const chlorinator = await pool.chlorinator.getChlorinatorMetrics();
  console.log(`Salt Level: ${chlorinator.saltLevel} ppm`);
  console.log(`Chlorinator Output: ${chlorinator.chlorinatorOutput}%`);

  // Check for alarms
  const alarms = await pool.chlorinator.getChlorinatorAlarms();
  if (alarms.lowSaltAlarm) console.log('⚠️  Low Salt Alarm!');
  if (alarms.highSaltAlarm) console.log('⚠️  High Salt Alarm!');
  if (alarms.cleanCellRequired) console.log('⚠️  Clean Cell Required!');
}

/**
 * Example 2: Control pool light
 */
async function controlPoolLight() {
  console.log('=== Pool Light Control ===');

  // Check current state
  const currentState = await pool.light.getPoolLightState();
  console.log(`Current State: ${currentState ? 'ON' : 'OFF'}`);

  // Toggle the light
  await pool.light.togglePoolLight();
  console.log('Toggled pool light');

  // Set specific light mode
  await pool.light.setLightMode('Party');
  console.log('Set light mode to Party');
}

/**
 * Example 3: Adjust chlorine output
 */
async function adjustChlorine(percent: number) {
  console.log('=== Adjusting Chlorine ===');

  await pool.chlorinator.setChlorineOutput(percent);
  console.log(`Set chlorine output to ${percent}%`);

  const newLevel = await pool.chlorinator.getChlorineOutputSetting();
  console.log(`New chlorine output: ${newLevel}%`);
}

/**
 * Example 4: Configure pump schedule
 */
async function configurePumpSchedule() {
  console.log('=== Configuring Pump Schedule ===');

  // Set schedule 1: 8am, Speed 2, waterfall on
  await pool.pump.setScheduleStartTime(1, '08:00:00');
  console.log('Set schedule 1 start time to 8:00 AM');

  await pool.pump.setScheduleSpeed(1, 'Speed 2');
  console.log('Set schedule 1 to Speed 2');

  await pool.pump.setPumpSpeed(2, 2200);
  console.log('Set Speed 2 to 2200 RPM');

  await pool.pump.setScheduleWaterfall(1, true);
  console.log('Enabled waterfall for schedule 1');
}

/**
 * Example 5: Set pump mode
 */
async function setPumpMode(mode: 'Auto' | 'Off' | 'Speed 1' | 'Speed 2' | 'Speed 3' | 'Speed 4' | 'Speed 5') {
  console.log(`=== Setting Pump Mode to ${mode} ===`);

  await pool.pump.setMode(mode);
  console.log(`Set pump mode to ${mode}`);

  const newMode = await pool.pump.getMode();
  console.log(`Current mode: ${newMode}`);
}

/**
 * Example 6: Get complete pool status
 */
async function getCompleteStatus() {
  console.log('=== Complete Pool Status ===');

  const status = await pool.getCompleteStatus();
  console.log(JSON.stringify(status, null, 2));
}

/**
 * Example 7: Monitor pool state changes
 */
async function monitorPoolState() {
  console.log('=== Monitoring Pool State ===');
  console.log('Press Ctrl+C to stop monitoring');

  // Get initial status
  const status = await pool.getCompleteStatus();
  console.log(`Initial RPM: ${status.pump.metrics.pumpRpm}`);
  console.log(`Initial Mode: ${status.pump.mode}`);

  // Monitor with polling (every 5 seconds)
  setInterval(async () => {
    const newStatus = await pool.getCompleteStatus();
    console.log(`\n[${new Date().toLocaleTimeString()}]`);
    console.log(`RPM: ${newStatus.pump.metrics.pumpRpm}`);
    console.log(`Mode: ${newStatus.pump.mode}`);
    console.log(`Running: ${newStatus.pump.running}`);
    console.log(`Water Temp: ${newStatus.temperature.waterTemperatureF}°F`);
  }, 5000);
}

/**
 * Example 8: Get schedule status information
 */
async function getScheduleInfo() {
  console.log('=== Schedule Information ===');

  const scheduleStatuses = await pool.pump.getScheduleStatuses();
  console.log(`Schedule 1 Status: ${scheduleStatuses.schedule1Status}`);
  console.log(`Schedule 2 Status: ${scheduleStatuses.schedule2Status}`);
  console.log(`Current Schedule: ${scheduleStatuses.currentSchedule}`);

  const scheduleRpms = await pool.pump.getScheduleRpms();
  console.log(`Schedule 1 RPM: ${scheduleRpms.schedule1Rpm}`);
  console.log(`Schedule 2 RPM: ${scheduleRpms.schedule2Rpm}`);
}

/**
 * Example 9: Perform maintenance tasks
 */
async function performMaintenance() {
  console.log('=== Maintenance Tasks ===');

  // Sync pump clock
  await pool.pump.syncPumpClock();
  console.log('Synced pump clock');

  // Refresh chlorinator data
  await pool.chlorinator.refreshChlorinator();
  console.log('Refreshed chlorinator data');
}

// Export examples for use in other files
export {
  getPoolStatus,
  controlPoolLight,
  adjustChlorine,
  configurePumpSchedule,
  setPumpMode,
  getCompleteStatus,
  monitorPoolState,
  getScheduleInfo,
  performMaintenance,
};
