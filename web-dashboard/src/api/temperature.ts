/**
 * Temperature API
 * Monitors air and water temperatures (non-chlorinator)
 */

import { BaseESPHomeClient } from './base.js';
import { SensorState } from '../types.js';

export interface TemperatureReadings {
  airTemperature: number;
  airTemperatureF: number;
  waterTemperature: number;
  waterTemperatureF: number;
}

export class TemperatureAPI extends BaseESPHomeClient {
  
  // ==================== Temperature Monitoring ====================
  
  /**
   * Get all temperature readings (air and water, excluding chlorinator)
   */
  async getTemperatures(): Promise<TemperatureReadings> {
    const [airC, airF, waterC, waterF] = await Promise.all([
      this.request<SensorState>('/sensor/air_temperature'),
      this.request<SensorState>('/sensor/air_temperature_f'),
      this.request<SensorState>('/sensor/water_temperature'),
      this.request<SensorState>('/sensor/water_temperature_f'),
    ]);

    return {
      airTemperature: airC.value,
      airTemperatureF: airF.value,
      waterTemperature: waterC.value,
      waterTemperatureF: waterF.value,
    };
  }

  /**
   * Get air temperature in Celsius
   */
  async getAirTemperature(): Promise<number> {
    const response = await this.request<SensorState>('/sensor/air_temperature');
    return response.value;
  }

  /**
   * Get air temperature in Fahrenheit
   */
  async getAirTemperatureF(): Promise<number> {
    const response = await this.request<SensorState>('/sensor/air_temperature_f');
    return response.value;
  }

  /**
   * Get water temperature in Celsius
   */
  async getWaterTemperature(): Promise<number> {
    const response = await this.request<SensorState>('/sensor/water_temperature');
    return response.value;
  }

  /**
   * Get water temperature in Fahrenheit
   */
  async getWaterTemperatureF(): Promise<number> {
    const response = await this.request<SensorState>('/sensor/water_temperature_f');
    return response.value;
  }
}
