/**
 * Pool Light API
 * Controls pool light power and modes
 */

import { BaseESPHomeClient } from './base.js';
import { SwitchState, SelectState } from '../types.js';

export class PoolLightAPI extends BaseESPHomeClient {
  
  // ==================== Pool Light Control ====================
  
  /**
   * Turn pool light on or off
   */
  async setPoolLight(state: boolean): Promise<void> {
    const action = state ? 'turn_on' : 'turn_off';
    await this.request(`/switch/pool_light/${action}`, 'POST');
  }

  /**
   * Get pool light power state
   */
  async getPoolLightState(): Promise<boolean> {
    const state = await this.request<SwitchState>('/switch/pool_light');
    return state.state;
  }

  /**
   * Toggle pool light
   */
  async togglePoolLight(): Promise<void> {
    await this.request('/switch/pool_light/toggle', 'POST');
  }

  /**
   * Set pool light mode
   */
  async setLightMode(mode: 'SAm (Color Sync)' | 'Party' | 'Romance' | 'Caribbean' | 
                           'American' | 'Sunset' | 'Royalty' | 'Blue' | 'Green' | 
                           'Red' | 'White' | 'Magenta' | 'Hold' | 'Recall'): Promise<void> {
    await this.request(`/select/pool_light_mode/set?option=${encodeURIComponent(mode)}`, 'POST');
  }

  /**
   * Get current pool light mode
   */
  async getLightMode(): Promise<string> {
    const state = await this.request<SelectState>('/select/pool_light_mode');
    return state.state;
  }

  /**
   * Get pool light status text
   */
  async getLightStatus(): Promise<string> {
    const state = await this.request<{ state: string }>('/text_sensor/pool_light_status');
    return state.state;
  }
}
