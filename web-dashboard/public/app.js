// --- Pump End Time Editing ---
window.editPumpEndTime = function () {
    document.getElementById('pump-end-time-popup').style.display = 'flex';
    // Pre-fill with current value
    const current = document.getElementById('pump-end-time-tbl').textContent.trim();
    let [time, ampm] = current.split(' ');
    if (time && ampm) {
        let [h, m] = time.split(':');
        h = parseInt(h);
        if (ampm === 'PM' && h !== 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        document.getElementById('pump-end-time-input').value = `${String(h).padStart(2, '0')}:${m}`;
    }
};
window.closePumpEndTimePopup = function () {
    document.getElementById('pump-end-time-popup').style.display = 'none';
};
window.savePumpEndTime = async function () {
    if (!pool) return;
    const val = document.getElementById('pump-end-time-input').value;
    try {
        await pool.pump.setPumpEndTime(val);
        showNotification('Pump end time updated', 'success');
        refreshScheduleOverview();
    } catch (e) {
        showNotification('Failed to update pump end time', 'error');
    }
    closePumpEndTimePopup();
};
// --- Schedule Overview Editing ---
let editingScheduleNum = null;

// Edit Start Time
window.editScheduleStart = function (num) {
    editingScheduleNum = num;
    document.getElementById('schedule-time-popup').style.display = 'flex';
    // Pre-fill with current value
    const current = document.getElementById(`schedule-${num}-start-tbl`).textContent.trim();
    // Convert to 24h for input
    let [time, ampm] = current.split(' ');
    if (time && ampm) {
        let [h, m] = time.split(':');
        h = parseInt(h);
        if (ampm === 'PM' && h !== 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        document.getElementById('schedule-time-input').value = `${String(h).padStart(2, '0')}:${m}`;
    }
};
window.closeScheduleTimePopup = function () {
    document.getElementById('schedule-time-popup').style.display = 'none';
    editingScheduleNum = null;
};
window.saveScheduleTime = async function () {
    if (!pool || !editingScheduleNum) return;
    const val = document.getElementById('schedule-time-input').value;
    try {
        await pool.pump.setScheduleStartTime(editingScheduleNum, val);
        showNotification('Start time updated', 'success');
        refreshScheduleOverview();
    } catch (e) {
        showNotification('Failed to update start time', 'error');
    }
    closeScheduleTimePopup();
};

// Edit Speed
window.editScheduleSpeed = function (num) {
    editingScheduleNum = num;
    document.getElementById('schedule-speed-popup').style.display = 'flex';
    // Pre-fill with current value
    const current = document.getElementById(`schedule-${num}-speed-tbl`).textContent.trim();
    document.getElementById('schedule-speed-select').value = current;
};
window.closeScheduleSpeedPopup = function () {
    document.getElementById('schedule-speed-popup').style.display = 'none';
    editingScheduleNum = null;
};
window.saveScheduleSpeed = async function () {
    if (!pool || !editingScheduleNum) return;
    const val = document.getElementById('schedule-speed-select').value;
    try {
        await pool.pump.setScheduleSpeed(editingScheduleNum, val);
        showNotification('Speed updated', 'success');
        refreshScheduleOverview();
    } catch (e) {
        showNotification('Failed to update speed', 'error');
    }
    closeScheduleSpeedPopup();
};

// Toggle Waterfall
window.toggleScheduleWaterfall = async function (num) {
    if (!pool) return;
    try {
        // Get current state
        const current = await pool.pump.getScheduleWaterfall(num);
        // Toggle to the opposite state
        const newState = !current;
        await pool.pump.setScheduleWaterfall(num, newState);
        showNotification(`Waterfall ${newState ? 'ON' : 'OFF'}`, 'success');
        refreshScheduleOverview();
    } catch (e) {
        showNotification('Failed to toggle waterfall', 'error');
    }
};
import { createPoolClient } from '../dist/esphome-api.js';

let pool = null;
let autoRefreshInterval = null;

// Initialize chlorine slider
document.getElementById('chlorine-slider').addEventListener('input', (e) => {
    document.getElementById('chlorine-value').textContent = e.target.value;
});

// Connect to ESPHome device
window.connectToDevice = async function () {
    const host = document.getElementById('host').value;
    const port = document.getElementById('port').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Determine if we need proxy (only on localhost dev server)
    const currentHost = window.location.hostname;
    const needsProxy = currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost === '';

    try {
        const host = document.getElementById('host').value.trim();
        const port = document.getElementById('port').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        pool = createPoolClient({
            host: host,
            port: parseInt(port) || 80,
            username: username || undefined,
            password: password || undefined,
            useProxy: needsProxy, // Only use proxy on dev server
        });

        // Test connection by getting pump status
        await pool.pump.getPumpRunning();

        // Update UI
        document.getElementById('connection-status').textContent = 'Connected';
        document.getElementById('connection-status').className = 'status-connected';
        document.getElementById('connect-btn').disabled = true;
        document.getElementById('disconnect-btn').disabled = false;

        // Hide configuration section
        document.getElementById('configuration-section').style.display = 'none';

        // Show all sections
        showAllSections();

        // Initial data load
        await refreshAll();

        showNotification('Connected successfully!', 'success');
    } catch (error) {
        console.error('Connection error:', error);
        showNotification('Connection failed: ' + error.message, 'error');
    }
};

// Disconnect
window.disconnectFromDevice = function () {
    pool = null;
    document.getElementById('connection-status').textContent = 'Disconnected';
    document.getElementById('connection-status').className = 'status-disconnected';
    document.getElementById('connect-btn').disabled = false;
    document.getElementById('disconnect-btn').disabled = true;

    // Show configuration section
    document.getElementById('configuration-section').style.display = 'block';

    // Hide all sections
    hideAllSections();

    // Stop auto-refresh
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        document.getElementById('auto-refresh-toggle').checked = false;
    }

    showNotification('Disconnected', 'info');
};

// Toggle Configuration Section
window.toggleConfiguration = function () {
    const configSection = document.getElementById('configuration-section');
    if (configSection.style.display === 'none') {
        configSection.style.display = 'block';
    } else {
        configSection.style.display = 'none';
    }
};

// Show all sections
function showAllSections() {
    const sections = [
        'pump-status-section',
        'temperatures-section',
        'alarms-section',
        'chlorinator-section',
        'pump-mode-section',
        'pump-speeds-section',
        'pool-light-section',
        'switches-section',
        'schedule-overview-section',
        //        'schedules-section',
        'auto-refresh-section',
        'system-section'
    ];
    sections.forEach(id => {
        document.getElementById(id).style.display = 'block';
    });
}

// Hide all sections
function hideAllSections() {
    const sections = [
        'pump-status-section',
        'temperatures-section',
        'alarms-section',
        'chlorinator-section',
        'pump-mode-section',
        'pump-speeds-section',
        'pool-light-section',
        'switches-section',
        'schedule-overview-section',
        'schedules-section',
        'maintenance-section',
        'auto-refresh-section',
        'system-section'
    ];
    sections.forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
}

// Refresh all data
async function refreshAll() {
    await Promise.all([
        refreshSystemInfo(),
        refreshPumpStatus(),
        refreshTemperatures(),
        refreshAlarms(),
        refreshChlorinator(),
        refreshPumpMode(),
        refreshPumpSpeeds(),
        refreshPoolLight(),
        refreshSwitches(),
        refreshScheduleStatuses(),
        refreshScheduleSettings(),
        refreshScheduleOverview()
    ]);
}

// Refresh System Info
window.refreshSystemInfo = async function () {
    if (!pool) return;
    try {
        const info = await pool.system.getSystemInfo();
        document.getElementById('esphome-version').textContent = info.esphomeVersion;
        document.getElementById('wifi-ssid').textContent = info.ssid;
        document.getElementById('wifi-ip').textContent = info.ipAddress;
        document.getElementById('wifi-signal').textContent = `${info.wifiSignal} dBm`;
    } catch (error) {
        console.error('Error refreshing system info:', error);
    }
};

// Refresh Pump Status
window.refreshPumpStatus = async function () {
    if (!pool) return;
    try {
        const pumpRunning = await pool.pump.getPumpRunning();
        updateStatusBadge('pump-running', pumpRunning);

        const pumpStatus = await pool.pump.getPumpStatus();
        updateStatusBadge('pump-status', pumpStatus);

        const metrics = await pool.pump.getPumpMetrics();
        document.getElementById('pump-rpm').textContent = metrics.pumpRpm;
        document.getElementById('pump-power').textContent = metrics.power;
        document.getElementById('pump-flow').textContent = metrics.flowM3H;
        document.getElementById('time-remaining').textContent = metrics.timeRemaining;

        const clockFormatted = await pool.pump.getPumpClockFormatted();
        document.getElementById('pump-clock-formatted').textContent = clockFormatted;

        const currentSchedule = await pool.pump.getCurrentSchedule();
        document.getElementById('current-schedule').textContent = currentSchedule;
    } catch (error) {
        console.error('Error refreshing pump status:', error);
    }
};

// Refresh Temperatures
window.refreshTemperatures = async function () {
    if (!pool) return;
    try {
        const temps = await pool.temperature.getTemperatures();
        document.getElementById('air-temp-f').textContent = temps.airTemperatureF;
        document.getElementById('pool-temp-f').textContent = temps.waterTemperatureF;

        try {
            const chlorinatorMetrics = await pool.chlorinator.getChlorinatorMetrics();
            document.getElementById('solar-temp-f').textContent = chlorinatorMetrics.chlorinatorTemperature;
        } catch (e) {
            document.getElementById('solar-temp-f').textContent = 'N/A';
        }
    } catch (error) {
        console.error('Error refreshing temperatures:', error);
    }
};

// Refresh Alarms
window.refreshAlarms = async function () {
    if (!pool) return;
    try {
        const alarms = await pool.chlorinator.getChlorinatorAlarms();
        updateAlarm('alarm-no-flow', alarms.noFlowAlarm);
        updateAlarm('alarm-low-salt', alarms.lowSaltAlarm);
        updateAlarm('alarm-high-salt', alarms.highSaltAlarm);
        updateAlarm('alarm-clean-cell', alarms.cleanCellRequired);
        updateAlarm('alarm-high-current', alarms.highCurrentAlarm);
        updateAlarm('alarm-low-voltage', alarms.lowVoltageAlarm);
        updateAlarm('alarm-low-temp', alarms.lowTemperatureAlarm);
        updateAlarm('alarm-check-pcb', alarms.checkPcb);
    } catch (error) {
        console.log('Chlorinator not available:', error.message);
        // Hide alarm section if chlorinator not present
    }
};

// Refresh Chlorinator
window.refreshChlorinator = async function () {
    if (!pool) return;
    try {
        const metrics = await pool.chlorinator.getChlorinatorMetrics();
        document.getElementById('salt-level').textContent = metrics.saltLevel;
        document.getElementById('chlorinator-status').textContent = metrics.chlorinatorStatus;
        document.getElementById('chlorinator-error').textContent = metrics.chlorinatorError;
        document.getElementById('chlorinator-output').textContent = metrics.chlorinatorOutput;

        const version = await pool.chlorinator.getChlorinatorVersion();
        document.getElementById('chlorinator-version').textContent = version;

        const output = await pool.chlorinator.getChlorineOutputSetting();
        document.getElementById('chlorine-slider').value = output;
        document.getElementById('chlorine-value').textContent = output;
    } catch (error) {
        console.log('Chlorinator not available:', error.message);
        // Set N/A for all chlorinator fields
        document.getElementById('salt-level').textContent = 'N/A';
        document.getElementById('chlorinator-status').textContent = 'Not Installed';
        document.getElementById('chlorinator-error').textContent = 'N/A';
        document.getElementById('chlorinator-output').textContent = 'N/A';
        document.getElementById('chlorinator-version').textContent = 'N/A';
    }
};

// Refresh Pump Mode
window.refreshPumpMode = async function () {
    if (!pool) return;
    try {
        const mode = await pool.pump.getMode();
        document.getElementById('current-mode').textContent = mode;
        document.getElementById('mode-select').value = mode;
    } catch (error) {
        console.error('Error refreshing pump mode:', error);
    }
};

// Refresh Pump Speeds
window.refreshPumpSpeeds = async function () {
    if (!pool) return;
    try {
        for (let i = 1; i <= 5; i++) {
            const speed = await pool.pump.getPumpSpeed(i);
            document.getElementById(`speed-${i}`).value = speed;
        }
    } catch (error) {
        console.error('Error refreshing pump speeds:', error);
    }
};

// Refresh Pool Light
window.refreshPoolLight = async function () {
    if (!pool) return;
    try {
        // Refresh pool light power switch
        const poolLight = await pool.light.getPoolLightState();
        const btn = document.getElementById('switch-pool-light');
        const isOn = poolLight === true || poolLight === 'ON';
        btn.textContent = isOn ? 'ON' : 'OFF';
        btn.className = isOn ? 'btn btn-toggle on' : 'btn btn-toggle off';

        // Refresh pool light mode (may not exist on all devices)
        try {
            const mode = await pool.light.getLightMode();
            document.getElementById('light-mode-select').value = mode;
            document.getElementById('current-light-mode').textContent = mode;
        } catch (modeError) {
            // Light mode not available on this device
            console.log('Light mode not available:', modeError.message);
        }
    } catch (error) {
        console.error('Error refreshing pool light:', error);
    }
};

// Refresh Switches
window.refreshSwitches = async function () {
    if (!pool) return;
    try {
        // Get waterfall state
        const waterfall = await pool.pump.getWaterfall();
        updateToggleButton('switch-waterfall', waterfall);

        // Get waterfall auto state
        const waterfallAuto = await pool.pump.getWaterfallAuto();
        updateToggleButton('switch-waterfall-auto', waterfallAuto);

        // Get auto schedule state
        const autoSchedule = await pool.pump.getAutoSchedule();
        updateToggleButton('switch-auto-schedule', autoSchedule);

        // Get takeover mode
        const takeover = await pool.pump.getTakeoverMode();
        updateToggleButton('switch-takeover', takeover);

        // Get off state
        const off = await pool.pump.getOff();
        updateToggleButton('switch-off', off);

        // Get pool light mode
        const lightMode = await pool.light.getLightMode();
        document.getElementById('current-light-mode').textContent = lightMode;
        document.getElementById('light-mode-select').value = lightMode;
    } catch (error) {
        console.error('Error refreshing switches:', error);
    }
};

// Refresh Schedule Statuses
window.refreshScheduleStatuses = async function () {
    if (!pool) return;
    try {
        const statuses = await pool.pump.getScheduleStatuses();
        document.getElementById('schedule-1-status').textContent = statuses.schedule1Status;
        document.getElementById('schedule-2-status').textContent = statuses.schedule2Status;
        document.getElementById('schedule-3-status').textContent = statuses.schedule3Status;
        document.getElementById('schedule-4-status').textContent = statuses.schedule4Status;
        document.getElementById('schedule-5-status').textContent = statuses.schedule5Status;

        // Load schedule off status
        const scheduleOffStatus = await pool.pump.getScheduleOffStatus();
        document.getElementById('schedule-off-status').textContent = scheduleOffStatus;
    } catch (error) {
        console.error('Error refreshing schedule statuses:', error);
    }
};

// Refresh Schedule Settings (times, speeds, waterfall)
window.refreshScheduleSettings = async function () {
    if (!pool) return;
    try {
        // Load all 5 schedules
        for (let i = 1; i <= 5; i++) {
            // Get start time
            const startTime = await pool.pump.getScheduleStartTime(i);
            const timeInput = document.getElementById(`schedule-${i}-time`);
            if (timeInput && startTime) {
                // Format time from HH:MM:SS to HH:MM
                timeInput.value = startTime.substring(0, 5);
            }

            // Get speed
            const speed = await pool.pump.getScheduleSpeed(i);
            const speedSelect = document.getElementById(`schedule-${i}-speed`);
            if (speedSelect && speed) {
                speedSelect.value = speed;
            }

            // Get waterfall setting
            const waterfall = await pool.pump.getScheduleWaterfall(i);
            const waterfallCheckbox = document.getElementById(`schedule-${i}-waterfall`);
            if (waterfallCheckbox) {
                waterfallCheckbox.checked = waterfall;
            }
        }
    } catch (error) {
        console.error('Error refreshing schedule settings:', error);
    }
};

// Refresh Schedule Overview
window.refreshScheduleOverview = async function () {
    if (!pool) return;
    try {
        // Helper function to convert 24-hour time to 12-hour format
        const convertTo12Hour = (time24) => {
            const [hours, minutes] = time24.split(':');
            let h = parseInt(hours);
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${h}:${minutes} ${ampm}`;
        };

        // Load header labels - these are not in modular API yet, use placeholders
        document.getElementById('blank-label').textContent = '';
        document.getElementById('start-label').textContent = 'Start';
        document.getElementById('speed-label').textContent = 'Speed';
        document.getElementById('rpm-label').textContent = 'RPM';
        document.getElementById('waterfall-label').textContent = 'Waterfall';

        // Get all schedule data
        const scheduleStatuses = await pool.pump.getScheduleStatuses();
        const scheduleRpms = await pool.pump.getScheduleRpms();

        // Load all 5 schedules data
        for (let i = 1; i <= 5; i++) {
            // Status
            const statusKey = `schedule${i}Status`;
            const statusText = scheduleStatuses[statusKey] ?? '';
            document.getElementById(`schedule-${i}-status-tbl`).textContent = statusText;

            // Start time - convert to 12-hour format
            const startTime = await pool.pump.getScheduleStartTime(i);
            document.getElementById(`schedule-${i}-start-tbl`).textContent = convertTo12Hour(startTime.substring(0, 5));

            // Speed
            const speed = await pool.pump.getScheduleSpeed(i);
            document.getElementById(`schedule-${i}-speed-tbl`).textContent = speed;

            // RPM
            const rpmKey = `schedule${i}Rpm`;
            document.getElementById(`schedule-${i}-rpm-tbl`).textContent = scheduleRpms[rpmKey] || '0';

            // Waterfall - display as text
            const waterfall = await pool.pump.getScheduleWaterfall(i);
            const waterfallSpan = document.getElementById(`schedule-${i}-waterfall-tbl`);
            const isOn = waterfall === true || waterfall === 'ON';
            waterfallSpan.textContent = isOn ? 'ON' : 'OFF';
            waterfallSpan.className = isOn ? 'waterfall-status on' : 'waterfall-status off';
        }

        // Footer - Schedule off status and pump end time
        const scheduleOffStatus = await pool.pump.getScheduleOffStatus();
        document.getElementById('schedule-off-status-tbl').textContent = scheduleOffStatus;

        const pumpEndTime = await pool.pump.getPumpEndTime();
        document.getElementById('pump-end-time-tbl').textContent = convertTo12Hour(pumpEndTime.substring(0, 5));

    } catch (error) {
        console.error('Error refreshing schedule overview:', error);
    }
};

// Set Chlorine Output
window.setChlorineOutput = async function () {
    if (!pool) return;
    try {
        const value = parseInt(document.getElementById('chlorine-slider').value);
        await pool.chlorinator.setChlorineOutput(value);
        showNotification(`Chlorine output set to ${value}%`, 'success');
        await refreshChlorinator();
    } catch (error) {
        console.error('Error setting chlorine output:', error);
        showNotification('Error setting chlorine output', 'error');
    }
};

// Set Pump Mode
window.setPumpMode = async function () {
    if (!pool) return;
    try {
        const mode = document.getElementById('mode-select').value;
        await pool.pump.setMode(mode);
        showNotification(`Pump mode set to ${mode}`, 'success');
        await refreshPumpMode();
    } catch (error) {
        console.error('Error setting pump mode:', error);
        showNotification('Error setting pump mode', 'error');
    }
};

// Set Pump Speed
window.setPumpSpeed = async function (speedNum) {
    if (!pool) return;
    try {
        const rpm = parseInt(document.getElementById(`speed-${speedNum}`).value);
        await pool.pump.setPumpSpeed(speedNum, rpm);
        showNotification(`Pump Speed ${speedNum} set to ${rpm} RPM`, 'success');
    } catch (error) {
        console.error('Error setting pump speed:', error);
        showNotification('Error setting pump speed', 'error');
    }
};

// Adjust Pump Speed with Spinners
window.adjustSpeed = function (speedNum, delta) {
    const input = document.getElementById(`speed-${speedNum}`);
    let currentValue = parseInt(input.value) || 450;
    let newValue = currentValue + delta;

    // Enforce min/max bounds
    const min = parseInt(input.min) || 450;
    const max = parseInt(input.max) || 3450;

    newValue = Math.max(min, Math.min(max, newValue));
    input.value = newValue;
};

// Toggle Switch
window.toggleSwitch = async function (switchId, button) {
    if (!pool) return;
    try {
        // Map switch IDs to API methods
        if (switchId === 'waterfall') {
            await pool.pump.toggleWaterfall();
            const state = await pool.pump.getWaterfall();
            updateToggleButton(button.id, state);
            showNotification(`Waterfall toggled ${state ? 'ON' : 'OFF'}`, 'success');
        } else if (switchId === 'pool_light') {
            await pool.light.togglePoolLight();
            const state = await pool.light.getPoolLightState();
            updateToggleButton(button.id, state);
            showNotification(`Pool light toggled ${state ? 'ON' : 'OFF'}`, 'success');
        } else if (switchId === 'takeover_mode') {
            await pool.pump.toggleTakeoverMode();
            const state = await pool.pump.getTakeoverMode();
            updateToggleButton(button.id, state);
            showNotification(`Takeover mode toggled ${state ? 'ON' : 'OFF'}`, 'success');
        } else if (switchId === 'waterfall__auto_') {
            await pool.pump.toggleWaterfallAuto();
            const state = await pool.pump.getWaterfallAuto();
            updateToggleButton(button.id, state);
            showNotification(`Waterfall auto mode toggled ${state ? 'ON' : 'OFF'}`, 'success');
        } else if (switchId === 'auto_schedule') {
            await pool.pump.toggleAutoSchedule();
            const state = await pool.pump.getAutoSchedule();
            updateToggleButton(button.id, state);
            showNotification(`Auto schedule toggled ${state ? 'ON' : 'OFF'}`, 'success');
        } else if (switchId === 'off') {
            await pool.pump.toggleOff();
            const state = await pool.pump.getOff();
            updateToggleButton(button.id, state);
            showNotification(`System OFF toggled ${state ? 'ON' : 'OFF'}`, 'success');
        } else {
            showNotification(`Switch ${switchId} not yet implemented`, 'warning');
        }
    } catch (error) {
        console.error('Error toggling switch:', error);
        showNotification('Error toggling switch', 'error');
    }
};

// Set Schedule
window.setSchedule = async function (scheduleNum) {
    if (!pool) return;
    try {
        const time = document.getElementById(`schedule-${scheduleNum}-time`).value + ':00';
        const speed = document.getElementById(`schedule-${scheduleNum}-speed`).value;
        const waterfall = document.getElementById(`schedule-${scheduleNum}-waterfall`).checked;

        await pool.pump.setScheduleStartTime(scheduleNum, time);
        await pool.pump.setScheduleSpeed(scheduleNum, speed);
        await pool.pump.setScheduleWaterfall(scheduleNum, waterfall);

        showNotification(`Schedule ${scheduleNum} configured`, 'success');
        await refreshScheduleStatuses();
    } catch (error) {
        console.error('Error setting schedule:', error);
        showNotification('Error setting schedule', 'error');
    }
};

// Sync Pump Clock
window.syncPumpClock = async function () {
    if (!pool) return;
    try {
        await pool.pump.syncPumpClock();
        showNotification('Pump clock synced', 'success');
        await refreshPumpStatus();
    } catch (error) {
        console.error('Error syncing pump clock:', error);
        showNotification('Error syncing pump clock', 'error');
    }
};

// Set Light Mode
window.setLightMode = async function () {
    if (!pool) return;
    const mode = document.getElementById('light-mode-select').value;
    if (!mode) return;

    try {
        await pool.light.setLightMode(mode);
        showNotification(`Light mode set to ${mode}`, 'success');
        await refreshSwitches();
    } catch (error) {
        console.error('Error setting light mode:', error);
        showNotification('Error setting light mode', 'error');
    }
};

// Refresh Chlorinator Action
window.refreshChlorinatorAction = async function () {
    if (!pool) return;
    try {
        await pool.chlorinator.refreshChlorinator();
        showNotification('Chlorinator refreshed', 'success');
        await refreshChlorinator();
    } catch (error) {
        console.error('Error refreshing chlorinator:', error);
        showNotification('Error refreshing chlorinator', 'error');
    }
};

// Toggle Auto Refresh
window.toggleAutoRefresh = function () {
    const enabled = document.getElementById('auto-refresh-toggle').checked;
    const interval = parseInt(document.getElementById('refresh-interval').value) * 1000;

    if (enabled) {
        autoRefreshInterval = setInterval(refreshAll, interval);
        showNotification('Auto-refresh enabled', 'success');
    } else {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
        showNotification('Auto-refresh disabled', 'info');
    }
};

// Helper Functions
function updateStatusBadge(elementId, state) {
    const element = document.getElementById(elementId);
    // Handle both boolean and string states
    const isOn = state === true || state === 'ON' || state === 'on';
    element.textContent = isOn ? 'ON' : 'OFF';
    element.className = 'status-badge ' + (isOn ? 'on' : 'off');
}

function updateAlarm(elementId, active) {
    const element = document.getElementById(elementId);
    // Handle both boolean and string states
    const isActive = active === true || active === 'ON' || active === 'on';
    if (isActive) {
        element.classList.add('active');
    } else {
        element.classList.remove('active');
    }
}

function updateToggleButton(elementId, state) {
    const button = document.getElementById(elementId);
    if (!button) return;

    // Handle both boolean and string states
    const isOn = state === true || state === 'ON' || state === 'on';

    button.textContent = isOn ? 'ON' : 'OFF';
    button.className = 'btn btn-toggle ' + (isOn ? 'on' : 'off');
}

function showNotification(message, type = 'info') {
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} ${message}`);

    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${emoji}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Auto-connect if API is available on same host
async function checkAndAutoConnect() {
    const currentHost = window.location.hostname;
    const defaultPort = 80;

    // Pre-fill host field
    document.getElementById('host').value = currentHost;

    // Skip auto-connect if on localhost/development server
    if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost === '') {
        console.log('Development mode - skipping auto-connect');
        return;
    }

    try {
        // Create a test client - no proxy needed when on same host as API
        const testClient = createPoolClient({
            host: currentHost,
            port: defaultPort,
            useProxy: false  // Direct connection when on same host
        });

        // Try to get pump status to verify API is available
        await testClient.pump.getPumpRunning();

        // API is available, auto-connect
        await connectToDevice();
        console.log('Auto-connected to API on same host');
    } catch (error) {
        // API not available on same host, show connection form - silent failure
    }
}

// Event Listeners
document.getElementById('connect-btn').addEventListener('click', connectToDevice);
document.getElementById('disconnect-btn').addEventListener('click', disconnectFromDevice);

// Check for auto-connect on page load
window.addEventListener('DOMContentLoaded', checkAndAutoConnect);
