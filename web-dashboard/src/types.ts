/**
 * ESPHome Entity Types
 */

export interface BinarySensorState {
  id: string;
  state: boolean;
  value: boolean;
}

export interface SensorState {
  id: string;
  state: number;
  value: number;
}

export interface SwitchState {
  id: string;
  state: boolean;
  value: boolean;
}

export interface TextSensorState {
  id: string;
  state: string;
  value: string;
}

export interface NumberState {
  id: string;
  state: number;
  value: number;
  min_value?: number;
  max_value?: number;
  step?: number;
}

export interface SelectState {
  id: string;
  state: string;
  value: string;
  options?: string[];
}

export interface TimeState {
  id: string;
  state: string; // HH:MM:SS format
  value: string;
}

export interface TextState {
  id: string;
  state: string;
  value: string;
}

export interface ButtonState {
  id: string;
}

/**
 * Pool Automation Entity IDs organized by type
 */
export const POOL_ENTITIES = {
  binarySensors: {
    pumpRunning: 'binary_sensor-pump_running',
    pumpStatus: 'binary_sensor-pump_status',
    noFlowAlarm: 'binary_sensor-no_flow_alarm',
    lowSaltAlarm: 'binary_sensor-low_salt_alarm',
    highSaltAlarm: 'binary_sensor-high_salt_alarm',
    cleanCellRequired: 'binary_sensor-clean_cell_required',
    highCurrentAlarm: 'binary_sensor-high_current_alarm',
    lowVoltageAlarm: 'binary_sensor-low_voltage_alarm',
    lowTemperatureAlarm: 'binary_sensor-low_temperature_alarm',
    checkPcb: 'binary_sensor-check_pcb',
  },
  
  sensors: {
    airTemperature: 'sensor-air_temperature',
    airTemperatureF: 'sensor-air_temperature_f',
    waterTemperature: 'sensor-water_temperature',
    waterTemperatureF: 'sensor-water_temperature_f',
    uptime: 'sensor-uptime',
    wifiSignal: 'sensor-wifi_signal',
    schedule2R: 'sensor-schedule_2_r',
    schedule1Rpm: 'sensor-schedule_1_rpm',
    schedule2Rpm: 'sensor-schedule_2_rpm',
    schedule3Rpm: 'sensor-schedule_3_rpm',
    schedule4Rpm: 'sensor-schedule_4_rpm',
    schedule5Rpm: 'sensor-schedule_5_rpm',
    power: 'sensor-power',
    pumpRpm: 'sensor-pump_rpm',
    flowM3H: 'sensor-flow_m__h',
    pressure: 'sensor-pressure',
    timeRemaining: 'sensor-time_remaining',
    pumpClock: 'sensor-pump_clock',
    saltLevel: 'sensor-salt_level',
    chlorinatorWaterTemperature: 'sensor-chlorinator_water_temperature',
    chlorinatorStatus: 'sensor-chlorinator_status',
    chlorinatorError: 'sensor-chlorinator_error',
    chlorinatorOutput: 'sensor-chlorinator_output__',
  },
  
  switches: {
    waterfall: 'switch-waterfall',
    waterfallAuto: 'switch-waterfall__auto_',
    off: 'switch-off',
    autoSchedule: 'switch-auto_schedule',
    schedule1Waterfall: 'switch-schedule_1_waterfall',
    schedule2Waterfall: 'switch-schedule_2_waterfall',
    schedule3Waterfall: 'switch-schedule_3_waterfall',
    schedule4Waterfall: 'switch-schedule_4_waterfall',
    schedule5Waterfall: 'switch-schedule_5_waterfall',
    takeoverMode: 'switch-takeover_mode',
    poolLight: 'switch-pool_light',
    factoryResetRestart: 'switch-factory_reset_restart',
  },
  
  buttons: {
    syncPumpClock: 'button-sync_pump_clock',
    refreshChlorinator: 'button-refresh_chlorinator',
    requestPumpStatus: 'button-request_pump_status',
    pumpRun: 'button-pump_run',
    pumpStop: 'button-pump_stop',
    pumpToLocalControl: 'button-pump_to_local_control',
    pumpToRemoteControl: 'button-pump_to_remote_control',
    runLocalProgram1: 'button-run_local_program_1',
    runLocalProgram2: 'button-run_local_program_2',
    runLocalProgram3: 'button-run_local_program_3',
    runLocalProgram4: 'button-run_local_program_4',
    runExternalProgram1: 'button-run_external_program_1',
    runExternalProgram2: 'button-run_external_program_2',
    runExternalProgram3: 'button-run_external_program_3',
    runExternalProgram4: 'button-run_external_program_4',
  },
  
  textSensors: {
    esphomeVersion: 'text_sensor-esphome_version',
    ssid: 'text_sensor-ssid',
    ipAddress: 'text_sensor-ip_address',
    pumpProgram: 'text_sensor-pump_program',
    pumpClockFormatted: 'text_sensor-pump_clock_formatted',
    currentSchedule: 'text_sensor-current_schedule',
    scheduleValidation: 'text_sensor-schedule_validation',
    scheduleOffStatus: 'text_sensor-schedule_off_status',
    schedule1Status: 'text_sensor-schedule_1_status',
    schedule2Status: 'text_sensor-schedule_2_status',
    schedule3Status: 'text_sensor-schedule_3_status',
    schedule4Status: 'text_sensor-schedule_4_status',
    schedule5Status: 'text_sensor-schedule_5_status',
    chlorinatorVersion: 'text_sensor-chlorinator_version',
    swgDebugInfo: 'text_sensor-swg_debug_info',
    poolLightStatus: 'text_sensor-pool_light_status',
    startLabel: 'text_sensor-start_label',
    speedLabel: 'text_sensor-speed_label',
    rpmLabel: 'text_sensor-rpm_label',
    waterfallLabel: 'text_sensor-waterfall_label',
    blankLabel: 'text_sensor-blank_label',
  },
  
  numbers: {
    pumpSpeed1: 'number-pump_speed_1',
    pumpSpeed2: 'number-pump_speed_2',
    pumpSpeed3: 'number-pump_speed_3',
    pumpSpeed4: 'number-pump_speed_4',
    pumpSpeed5: 'number-pump_speed_5',
    chlorineOutput: 'number-chlorine_output',
    pumpSpeedTest: 'number-pump_speed_test__',
  },
  
  times: {
    schedule1Start: 'time-schedule_1_start',
    schedule2Start: 'time-schedule_2_start',
    schedule3Start: 'time-schedule_3_start',
    schedule4Start: 'time-schedule_4_start',
    schedule5Start: 'time-schedule_5_start',
    pumpEndTime: 'time-pump_end_time',
  },
  
  texts: {
    myInputText: 'text-my_input_text',
  },
  
  selects: {
    mode: 'select-mode',
    schedule1Speed: 'select-schedule_1_speed',
    schedule2Speed: 'select-schedule_2_speed',
    schedule3Speed: 'select-schedule_3_speed',
    schedule4Speed: 'select-schedule_4_speed',
    schedule5Speed: 'select-schedule_5_speed',
    poolLightMode: 'select-pool_light_mode',
  },
} as const;

/**
 * Pool Automation State - Complete device state
 */
export interface PoolAutomationState {
  // Binary Sensors
  pumpRunning: boolean;
  pumpStatus: boolean;
  noFlowAlarm: boolean;
  lowSaltAlarm: boolean;
  highSaltAlarm: boolean;
  cleanCellRequired: boolean;
  highCurrentAlarm: boolean;
  lowVoltageAlarm: boolean;
  lowTemperatureAlarm: boolean;
  checkPcb: boolean;
  
  // Sensors (temperature, measurements, etc.)
  airTemperature: number;
  airTemperatureF: number;
  waterTemperature: number;
  waterTemperatureF: number;
  uptime: number;
  wifiSignal: number;
  power: number;
  pumpRpm: number;
  flowM3H: number;
  pressure: number;
  timeRemaining: number;
  pumpClock: number;
  saltLevel: number;
  chlorinatorWaterTemperature: number;
  chlorinatorStatus: number;
  chlorinatorError: number;
  chlorinatorOutput: number;
  
  // Schedule RPMs
  schedule1Rpm: number;
  schedule2Rpm: number;
  schedule2R: number;
  schedule3Rpm: number;
  schedule4Rpm: number;
  schedule5Rpm: number;
  
  // Switches
  waterfall: boolean;
  waterfallAuto: boolean;
  off: boolean;
  autoSchedule: boolean;
  schedule1Waterfall: boolean;
  schedule2Waterfall: boolean;
  schedule3Waterfall: boolean;
  schedule4Waterfall: boolean;
  schedule5Waterfall: boolean;
  takeoverMode: boolean;
  poolLight: boolean;
  
  // Text Sensors
  esphomeVersion: string;
  ssid: string;
  ipAddress: string;
  pumpProgram: string;
  pumpClockFormatted: string;
  currentSchedule: string;
  scheduleValidation: string;
  scheduleOffStatus: string;
  schedule1Status: string;
  schedule2Status: string;
  schedule3Status: string;
  schedule4Status: string;
  schedule5Status: string;
  chlorinatorVersion: string;
  swgDebugInfo: string;
  poolLightStatus: string;
  
  // Numbers
  pumpSpeed1: number;
  pumpSpeed2: number;
  pumpSpeed3: number;
  pumpSpeed4: number;
  pumpSpeed5: number;
  chlorineOutput: number;
  pumpSpeedTest: number;
  
  // Selects
  mode: string;
  schedule1Speed: string;
  schedule2Speed: string;
  schedule3Speed: string;
  schedule4Speed: string;
  schedule5Speed: string;
  poolLightMode: string;
  
  // Times
  schedule1Start: string;
  schedule2Start: string;
  schedule3Start: string;
  schedule4Start: string;
  schedule5Start: string;
  pumpEndTime: string;
  
  // Text
  myInputText: string;
}
