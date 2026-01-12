/**
 * ESPHome Pool Automation API - Modular Structure
 * 
 * This file re-exports the new modular API components.
 * Use createPoolClient() for the unified client with all subsystems.
 */

import { ESPHomeConfig } from './api/base.js';
import { createPoolClient, PoolAutomationClient } from './api/index.js';

// Export modular components
export { BaseESPHomeClient, ESPHomeConfig } from './api/base.js';
export { PoolLightAPI } from './api/pool-light.js';
export { TemperatureAPI, TemperatureReadings } from './api/temperature.js';
export { PumpAPI, PumpMetrics, ScheduleRpms, ScheduleStatuses } from './api/pump.js';
export { ChlorinatorAPI, ChlorinatorMetrics, ChlorinatorAlarms } from './api/chlorinator.js';
export { SystemAPI, SystemInfo } from './api/system.js';
export { PoolAutomationClient, createPoolClient } from './api/index.js';

// Re-export types
export * from './types.js';

/**
 * Create a new Pool Automation API client (unified client with all subsystems)
 */
export function createClient(config: ESPHomeConfig): PoolAutomationClient {
  return createPoolClient(config);
}


