/**
 * System API
 * Provides information about the ESPHome device itself
 */

import { BaseESPHomeClient } from './base.js';
import { SensorState, TextSensorState } from '../types.js';

export interface SystemInfo {
    esphomeVersion: string;
    ssid: string;
    ipAddress: string;
    wifiSignal: number;
    uptime: number;
}

export class SystemAPI extends BaseESPHomeClient {

    /**
     * Get all system information
     */
    async getSystemInfo(): Promise<SystemInfo> {
        const [version, ssid, ip, signal, uptime] = await Promise.all([
            this.request<TextSensorState>('/text_sensor/esphome_version'),
            this.request<TextSensorState>('/text_sensor/ssid'),
            this.request<TextSensorState>('/text_sensor/ip_address'),
            this.request<SensorState>('/sensor/wifi_signal'),
            this.request<SensorState>('/sensor/uptime'),
        ]);

        return {
            esphomeVersion: version.value,
            ssid: ssid.value,
            ipAddress: ip.value,
            wifiSignal: signal.value,
            uptime: uptime.value,
        };
    }

    /**
     * Get ESPHome version
     */
    async getEsphomeVersion(): Promise<string> {
        const response = await this.request<TextSensorState>('/text_sensor/esphome_version');
        return response.value;
    }

    /**
     * Get WiFi SSID
     */
    async getSsid(): Promise<string> {
        const response = await this.request<TextSensorState>('/text_sensor/ssid');
        return response.value;
    }

    /**
     * Get IP Address
     */
    async getIpAddress(): Promise<string> {
        const response = await this.request<TextSensorState>('/text_sensor/ip_address');
        return response.value;
    }

    /**
     * Get WiFi Signal Strength (dBm)
     */
    async getWifiSignal(): Promise<number> {
        const response = await this.request<SensorState>('/sensor/wifi_signal');
        return response.value;
    }

    /**
     * Get System Uptime (seconds)
     */
    async getUptime(): Promise<number> {
        const response = await this.request<SensorState>('/sensor/uptime');
        return response.value;
    }
}
