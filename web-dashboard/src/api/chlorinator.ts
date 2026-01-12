/**
 * Chlorinator API
 * Controls and monitors salt water chlorinator
 */

import { BaseESPHomeClient } from './base.js';
import { BinarySensorState, SensorState, NumberState, TextSensorState } from '../types.js';

export interface ChlorinatorMetrics {
  saltLevel: number;
  chlorinatorTemperature: number;
  chlorinatorStatus: number;
  chlorinatorError: number;
  chlorinatorOutput: number;
}

export interface ChlorinatorAlarms {
  noFlowAlarm: boolean;
  lowSaltAlarm: boolean;
  highSaltAlarm: boolean;
  cleanCellRequired: boolean;
  highCurrentAlarm: boolean;
  lowVoltageAlarm: boolean;
  lowTemperatureAlarm: boolean;
  checkPcb: boolean;
}

export class ChlorinatorAPI extends BaseESPHomeClient {
  
  // ==================== Chlorinator Metrics ====================
  
  /**
   * Get all chlorinator metrics
   */
  async getChlorinatorMetrics(): Promise<ChlorinatorMetrics> {
    const [salt, temp, status, error, output] = await Promise.all([
      this.request<SensorState>('/sensor/salt_level'),
      this.request<SensorState>('/sensor/chlorinator_water_temperature'),
      this.request<SensorState>('/sensor/chlorinator_status'),
      this.request<SensorState>('/sensor/chlorinator_error'),
      this.request<SensorState>('/sensor/chlorinator_output__'),
    ]);

    return {
      saltLevel: salt.state,
      chlorinatorTemperature: temp.state,
      chlorinatorStatus: status.state,
      chlorinatorError: error.state,
      chlorinatorOutput: output.state,
    };
  }

  /**
   * Get salt level (ppm)
   */
  async getSaltLevel(): Promise<number> {
    const state = await this.request<SensorState>('/sensor/salt_level');
    return state.state;
  }

  /**
   * Get chlorinator water temperature
   */
  async getChlorinatorTemperature(): Promise<number> {
    const state = await this.request<SensorState>('/sensor/chlorinator_water_temperature');
    return state.state;
  }

  /**
   * Get chlorinator status code
   */
  async getChlorinatorStatus(): Promise<number> {
    const state = await this.request<SensorState>('/sensor/chlorinator_status');
    return state.state;
  }

  /**
   * Get chlorinator error code
   */
  async getChlorinatorError(): Promise<number> {
    const state = await this.request<SensorState>('/sensor/chlorinator_error');
    return state.state;
  }

  /**
   * Get current chlorinator output percentage
   */
  async getChlorinatorOutput(): Promise<number> {
    const state = await this.request<SensorState>('/sensor/chlorinator_output__');
    return state.state;
  }

  // ==================== Chlorine Output Control ====================
  
  /**
   * Set chlorine output percentage (0-100%)
   */
  async setChlorineOutput(percent: number): Promise<void> {
    if (percent < 0 || percent > 100) {
      throw new Error('Chlorine output must be between 0 and 100');
    }
    await this.request(`/number/chlorine_output/set?value=${percent}`, 'POST');
  }

  /**
   * Get chlorine output setting
   */
  async getChlorineOutputSetting(): Promise<number> {
    const state = await this.request<NumberState>('/number/chlorine_output');
    return state.state;
  }

  // ==================== Chlorinator Alarms ====================
  
  /**
   * Get all chlorinator alarm states
   */
  async getChlorinatorAlarms(): Promise<ChlorinatorAlarms> {
    const [noFlow, lowSalt, highSalt, cleanCell, highCurrent, lowVoltage, lowTemp, checkPcb] = await Promise.all([
      this.request<BinarySensorState>('/binary_sensor/no_flow_alarm'),
      this.request<BinarySensorState>('/binary_sensor/low_salt_alarm'),
      this.request<BinarySensorState>('/binary_sensor/high_salt_alarm'),
      this.request<BinarySensorState>('/binary_sensor/clean_cell_required'),
      this.request<BinarySensorState>('/binary_sensor/high_current_alarm'),
      this.request<BinarySensorState>('/binary_sensor/low_voltage_alarm'),
      this.request<BinarySensorState>('/binary_sensor/low_temperature_alarm'),
      this.request<BinarySensorState>('/binary_sensor/check_pcb'),
    ]);

    return {
      noFlowAlarm: noFlow.state,
      lowSaltAlarm: lowSalt.state,
      highSaltAlarm: highSalt.state,
      cleanCellRequired: cleanCell.state,
      highCurrentAlarm: highCurrent.state,
      lowVoltageAlarm: lowVoltage.state,
      lowTemperatureAlarm: lowTemp.state,
      checkPcb: checkPcb.state,
    };
  }

  // ==================== Chlorinator Information ====================
  
  /**
   * Get chlorinator version information
   */
  async getChlorinatorVersion(): Promise<string> {
    const state = await this.request<TextSensorState>('/text_sensor/chlorinator_version');
    return state.state;
  }

  /**
   * Get chlorinator debug information
   */
  async getChlorinatorDebug(): Promise<string> {
    const state = await this.request<TextSensorState>('/text_sensor/chlorinator_debug');
    return state.state;
  }

  // ==================== Maintenance ====================
  
  /**
   * Refresh chlorinator data
   */
  async refreshChlorinator(): Promise<void> {
    await this.request('/button/refresh_chlorinator/press', 'POST');
  }
}
