/**
 * Unified Pool Automation API Client
 * Combines all modular API components
 */

import { ESPHomeConfig } from './base.js';
import { PoolLightAPI } from './pool-light.js';
import { TemperatureAPI } from './temperature.js';
import { PumpAPI } from './pump.js';
import { ChlorinatorAPI } from './chlorinator.js';
import { SystemAPI } from './system.js';

export class PoolAutomationClient {
  public readonly light: PoolLightAPI;
  public readonly temperature: TemperatureAPI;
  public readonly pump: PumpAPI;
  public readonly chlorinator: ChlorinatorAPI;
  public readonly system: SystemAPI;

  constructor(config: ESPHomeConfig) {
    this.light = new PoolLightAPI(config);
    this.temperature = new TemperatureAPI(config);
    this.pump = new PumpAPI(config);
    this.chlorinator = new ChlorinatorAPI(config);
    this.system = new SystemAPI(config);
  }

  /**
   * Get complete pool status from all subsystems
   */
  async getCompleteStatus() {
    const [
      lightStatus,
      temps,
      pumpMetrics,
      pumpRunning,
      pumpMode,
      chlorMetrics,
      chlorAlarms,
      scheduleRpms,
      scheduleStatuses,
      systemInfo
    ] = await Promise.all([
      this.light.getLightStatus().catch(() => 'Unknown'),
      this.temperature.getTemperatures(),
      this.pump.getPumpMetrics(),
      this.pump.getPumpRunning(),
      this.pump.getMode(),
      this.chlorinator.getChlorinatorMetrics(),
      this.chlorinator.getChlorinatorAlarms(),
      this.pump.getScheduleRpms(),
      this.pump.getScheduleStatuses(),
      this.system.getSystemInfo()
    ]);

    return {
      light: {
        status: lightStatus,
      },
      temperature: temps,
      pump: {
        running: pumpRunning,
        mode: pumpMode,
        metrics: pumpMetrics,
        scheduleRpms: scheduleRpms,
        scheduleStatuses: scheduleStatuses,
      },
      chlorinator: {
        metrics: chlorMetrics,
        alarms: chlorAlarms,
      },
      system: systemInfo,
    };
  }
}

/**
 * Create a new modular Pool Automation API client
 */
export function createPoolClient(config: ESPHomeConfig): PoolAutomationClient {
  return new PoolAutomationClient(config);
}
