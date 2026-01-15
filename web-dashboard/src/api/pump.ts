/**
 * Pool Pump API
 * Controls pump operation, speeds, schedules, and modes
 */

import { BaseESPHomeClient } from './base.js';
import { BinarySensorState, SensorState, SwitchState, SelectState, NumberState, TimeState, TextSensorState } from '../types.js';

export interface PumpMetrics {
  pumpRpm: number;
  power: number;
  flowM3H: number;
  pressure: number;
  timeRemaining: number;
  pumpClock: number;
}

export interface ScheduleRpms {
  schedule1Rpm: number;
  schedule2Rpm: number;
  schedule2R: number;
  schedule3Rpm: number;
  schedule4Rpm: number;
  schedule5Rpm: number;
}

export interface ScheduleStatuses {
  scheduleOffStatus: string;
  schedule1Status: string;
  schedule2Status: string;
  schedule3Status: string;
  schedule4Status: string;
  schedule5Status: string;
  currentSchedule: string;
  scheduleValidation: string;
}

export class PumpAPI extends BaseESPHomeClient {

  // ==================== Pump Status ====================

  /**
   * Check if pump is running
   */
  async getPumpRunning(): Promise<boolean> {
    const state = await this.request<BinarySensorState>('/binary_sensor/pump_running');
    return state.state;
  }

  /**
   * Get pump status
   */
  async getPumpStatus(): Promise<boolean> {
    const state = await this.request<BinarySensorState>('/binary_sensor/pump_status');
    return state.state;
  }

  /**
   * Get pump program/mode
   */
  async getPumpProgram(): Promise<string> {
    const state = await this.request<TextSensorState>('/text_sensor/pump_program');
    return state.state;
  }

  /**
   * Get all pump metrics (RPM, power, flow, pressure, time, clock)
   */
  async getPumpMetrics(): Promise<PumpMetrics> {
    const [rpm, power, flow, pressure, timeRemaining, clock] = await Promise.all([
      this.request<SensorState>('/sensor/pump_rpm'),
      this.request<SensorState>('/sensor/power'),
      this.request<SensorState>('/sensor/flow_m__h'),
      this.request<SensorState>('/sensor/pressure'),
      this.request<SensorState>('/sensor/time_remaining'),
      this.request<SensorState>('/sensor/pump_clock'),
    ]);

    return {
      pumpRpm: rpm.state,
      power: power.state,
      flowM3H: flow.state,
      pressure: pressure.state,
      timeRemaining: timeRemaining.state,
      pumpClock: clock.state,
    };
  }

  // ==================== Pump Mode Control ====================

  /**
   * Set pump mode
   */
  async setMode(mode: 'Auto' | 'Off' | 'Speed 1' | 'Speed 2' | 'Speed 3' | 'Speed 4' | 'Speed 5'): Promise<void> {
    await this.request(`/select/mode/set?option=${encodeURIComponent(mode)}`, 'POST');
  }

  /**
   * Get current pump mode
   */
  async getMode(): Promise<string> {
    const state = await this.request<SelectState>('/select/mode');
    return state.state;
  }

  /**
   * Turn pump off
   */
  async setPumpOff(state: boolean): Promise<void> {
    const action = state ? 'turn_on' : 'turn_off';
    await this.request(`/switch/off/${action}`, 'POST');
  }

  // ==================== Pump Speed Configuration ====================

  /**
   * Set a pump speed (450-3450 RPM)
   */
  async setPumpSpeed(speedNum: 1 | 2 | 3 | 4 | 5, rpm: number): Promise<void> {
    if (rpm < 450 || rpm > 3450) {
      throw new Error('RPM must be between 450 and 3450');
    }
    await this.request(`/number/pump_speed_${speedNum}/set?value=${rpm}`, 'POST');
  }

  /**
   * Get a pump speed value
   */
  async getPumpSpeed(speedNum: 1 | 2 | 3 | 4 | 5): Promise<number> {
    const state = await this.request<NumberState>(`/number/pump_speed_${speedNum}`);
    return state.state;
  }

  /**
   * Get all pump speed settings
   */
  async getAllPumpSpeeds(): Promise<number[]> {
    const speeds = await Promise.all([
      this.getPumpSpeed(1),
      this.getPumpSpeed(2),
      this.getPumpSpeed(3),
      this.getPumpSpeed(4),
      this.getPumpSpeed(5),
    ]);
    return speeds;
  }

  // ==================== Schedule Control ====================

  /**
   * Enable or disable auto schedule
   */
  async setAutoSchedule(state: boolean): Promise<void> {
    const action = state ? 'turn_on' : 'turn_off';
    await this.request(`/switch/auto_schedule/${action}`, 'POST');
  }

  /**
   * Set schedule start time (HH:MM:SS format)
   */
  async setScheduleStartTime(scheduleNum: 1 | 2 | 3 | 4 | 5, time: string): Promise<void> {
    await this.request(`/time/schedule_${scheduleNum}_start/set?value=${encodeURIComponent(time)}`, 'POST');
  }

  /**
   * Get schedule start time
   */
  async getScheduleStartTime(scheduleNum: 1 | 2 | 3 | 4 | 5): Promise<string> {
    const state = await this.request<TimeState>(`/time/schedule_${scheduleNum}_start`);
    return state.state;
  }

  /**
   * Set schedule speed
   */
  async setScheduleSpeed(scheduleNum: 1 | 2 | 3 | 4 | 5, speed: 'Off' | 'Speed 1' | 'Speed 2' | 'Speed 3' | 'Speed 4' | 'Speed 5'): Promise<void> {
    await this.request(`/select/schedule_${scheduleNum}_speed/set?option=${encodeURIComponent(speed)}`, 'POST');
  }

  /**
   * Get schedule speed
   */
  async getScheduleSpeed(scheduleNum: 1 | 2 | 3 | 4 | 5): Promise<string> {
    const state = await this.request<SelectState>(`/select/schedule_${scheduleNum}_speed`);
    return state.state;
  }

  /**
   * Set schedule waterfall state
   */
  async setScheduleWaterfall(scheduleNum: 1 | 2 | 3 | 4 | 5, state: boolean): Promise<void> {
    const action = state ? 'turn_on' : 'turn_off';
    await this.request(`/switch/schedule_${scheduleNum}_waterfall/${action}`, 'POST');
  }

  /**
   * Get schedule waterfall state
   */
  async getScheduleWaterfall(scheduleNum: 1 | 2 | 3 | 4 | 5): Promise<boolean> {
    const state = await this.request<SwitchState>(`/switch/schedule_${scheduleNum}_waterfall`);
    return (state.state as any) === 'ON' || state.state === true;
  }

  /**
   * Set pump end time (HH:MM:SS format)
   */
  async setPumpEndTime(time: string): Promise<void> {
    await this.request(`/time/pump_end_time/set?value=${encodeURIComponent(time)}`, 'POST');
  }

  /**
   * Get pump end time
   */
  async getPumpEndTime(): Promise<string> {
    const state = await this.request<TimeState>('/time/pump_end_time');
    return state.state;
  }

  /**
   * Get all schedule RPM values
   */
  async getScheduleRpms(): Promise<ScheduleRpms> {
    const [rpm1, rpm2, rpm2r, rpm3, rpm4, rpm5] = await Promise.all([
      this.request<SensorState>('/sensor/schedule_1_rpm'),
      this.request<SensorState>('/sensor/schedule_2_rpm'),
      this.request<SensorState>('/sensor/schedule_2_r'),
      this.request<SensorState>('/sensor/schedule_3_rpm'),
      this.request<SensorState>('/sensor/schedule_4_rpm'),
      this.request<SensorState>('/sensor/schedule_5_rpm'),
    ]);

    return {
      schedule1Rpm: rpm1.state,
      schedule2Rpm: rpm2.state,
      schedule2R: rpm2r.state,
      schedule3Rpm: rpm3.state,
      schedule4Rpm: rpm4.state,
      schedule5Rpm: rpm5.state,
    };
  }

  /**
   * Get all schedule statuses
   */
  async getScheduleStatuses(): Promise<ScheduleStatuses> {
    const [off, s1, s2, s3, s4, s5, current, validation] = await Promise.all([
      this.request<TextSensorState>('/text_sensor/schedule_off_status'),
      this.request<TextSensorState>('/text_sensor/schedule_1_status'),
      this.request<TextSensorState>('/text_sensor/schedule_2_status'),
      this.request<TextSensorState>('/text_sensor/schedule_3_status'),
      this.request<TextSensorState>('/text_sensor/schedule_4_status'),
      this.request<TextSensorState>('/text_sensor/schedule_5_status'),
      this.request<TextSensorState>('/text_sensor/current_schedule'),
      this.request<TextSensorState>('/text_sensor/schedule_validation'),
    ]);

    return {
      scheduleOffStatus: off.state,
      schedule1Status: s1.state,
      schedule2Status: s2.state,
      schedule3Status: s3.state,
      schedule4Status: s4.state,
      schedule5Status: s5.state,
      currentSchedule: current.state,
      scheduleValidation: validation.state,
    };
  }

  // ==================== Waterfall Control ====================

  /**
   * Set waterfall state
   */
  async setWaterfall(state: boolean): Promise<void> {
    const action = state ? 'turn_on' : 'turn_off';
    await this.request(`/switch/waterfall/${action}`, 'POST');
  }

  /**
   * Set waterfall auto mode
   */
  async setWaterfallAuto(state: boolean): Promise<void> {
    const action = state ? 'turn_on' : 'turn_off';
    await this.request(`/switch/waterfall__auto_/${action}`, 'POST');
  }

  /**
   * Get waterfall state
   */
  async getWaterfall(): Promise<boolean> {
    const state = await this.request<SwitchState>('/switch/waterfall');
    return (state.state as any) === 'ON' || state.state === true;
  }

  /**
   * Get waterfall auto mode state
   */
  async getWaterfallAuto(): Promise<boolean> {
    const state = await this.request<SwitchState>('/switch/waterfall__auto_');
    return (state.state as any) === 'ON' || state.state === true;
  }

  /**
   * Toggle waterfall
   */
  async toggleWaterfall(): Promise<void> {
    await this.request('/switch/waterfall/toggle', 'POST');
  }

  /**
   * Get auto schedule state
   */
  async getAutoSchedule(): Promise<boolean> {
    const state = await this.request<SwitchState>('/switch/auto_schedule');
    return (state.state as any) === 'ON' || state.state === true;
  }

  /**
   * Get takeover mode state
   */
  async getTakeoverMode(): Promise<boolean> {
    const state = await this.request<SwitchState>('/switch/takeover_mode');
    return (state.state as any) === 'ON' || state.state === true;
  }

  /**
   * Get off switch state
   */
  async getOff(): Promise<boolean> {
    const state = await this.request<SwitchState>('/switch/off');
    return (state.state as any) === 'ON' || state.state === true;
  }

  /**
   * Get pump clock formatted
   */
  async getPumpClockFormatted(): Promise<string> {
    const state = await this.request<TextSensorState>('/text_sensor/pump_clock_formatted');
    return state.state;
  }

  /**
   * Get current schedule
   */
  async getCurrentSchedule(): Promise<string> {
    const state = await this.request<TextSensorState>('/text_sensor/current_schedule');
    return state.state;
  }

  /**
   * Get schedule off status
   */
  async getScheduleOffStatus(): Promise<string> {
    const state = await this.request<TextSensorState>('/text_sensor/schedule_off_status');
    return state.state;
  }

  // ==================== Maintenance ====================

  /**
   * Sync pump clock with system time
   */
  async syncPumpClock(): Promise<void> {
    await this.request('/button/sync_pump_clock/press', 'POST');
  }

  /**
   * Toggle takeover mode
   */
  async toggleTakeoverMode(): Promise<void> {
    await this.request('/switch/takeover_mode/toggle', 'POST');
  }

  /**
   * Toggle waterfall auto mode
   */
  async toggleWaterfallAuto(): Promise<void> {
    await this.request('/switch/waterfall__auto_/toggle', 'POST');
  }

  /**
   * Toggle auto schedule
   */
  async toggleAutoSchedule(): Promise<void> {
    await this.request('/switch/auto_schedule/toggle', 'POST');
  }

  /**
   * Toggle off switch
   */
  async toggleOff(): Promise<void> {
    await this.request('/switch/off/toggle', 'POST');
  }

  /**
   * Enable takeover mode
   */
  async setTakeoverMode(state: boolean): Promise<void> {
    const action = state ? 'turn_on' : 'turn_off';
    await this.request(`/switch/takeover_mode/${action}`, 'POST');
  }

  // ==================== Pump Control Buttons ====================

  /**
   * Request pump status update
   */
  async requestPumpStatus(): Promise<void> {
    await this.request('/button/request_pump_status/press', 'POST');
  }

  /**
   * Run pump
   */
  async runPump(): Promise<void> {
    await this.request('/button/pump_run/press', 'POST');
  }

  /**
   * Stop pump
   */
  async stopPump(): Promise<void> {
    await this.request('/button/pump_stop/press', 'POST');
  }

  /**
   * Set pump to local control
   */
  async pumpToLocalControl(): Promise<void> {
    await this.request('/button/pump_to_local_control/press', 'POST');
  }

  /**
   * Set pump to remote control
   */
  async pumpToRemoteControl(): Promise<void> {
    await this.request('/button/pump_to_remote_control/press', 'POST');
  }

  /**
   * Run local program (1-4)
   */
  async runLocalProgram(programNum: 1 | 2 | 3 | 4): Promise<void> {
    await this.request(`/button/run_local_program_${programNum}/press`, 'POST');
  }

  /**
   * Run external program (1-4)
   */
  async runExternalProgram(programNum: 1 | 2 | 3 | 4): Promise<void> {
    await this.request(`/button/run_external_program_${programNum}/press`, 'POST');
  }
}
