/**
 * Base ESPHome API Client
 * Provides core HTTP request functionality
 */

export interface ESPHomeConfig {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  useProxy?: boolean;
}

export class BaseESPHomeClient {
  protected baseUrl: string;
  protected auth?: string;
  protected useProxy: boolean;
  // Shared state to ensure proxy is configured and track current config
  private static proxyConfigPromise: Promise<void> | null = null;
  private static currentProxyTarget: string | null = null;

  constructor(config: ESPHomeConfig) {
    this.useProxy = config.useProxy ?? false;
    const port = config.port || 80;
    const target = `${config.host}:${port}`;

    if (this.useProxy) {
      this.baseUrl = '/api/proxy';

      // If target changed or config never started, start configuration
      if (BaseESPHomeClient.currentProxyTarget !== target || !BaseESPHomeClient.proxyConfigPromise) {
        BaseESPHomeClient.currentProxyTarget = target;
        BaseESPHomeClient.proxyConfigPromise = this.configureProxy(config.host, port, config.username, config.password);
      }
    } else {
      this.baseUrl = `http://${config.host}:${port}`;
    }

    if (config.username && config.password) {
      const credentials = btoa(`${config.username}:${config.password}`);
      this.auth = `Basic ${credentials}`;
    }
  }

  private async configureProxy(host: string, port: number, username?: string, password?: string) {
    const auth = username && password ? `Basic ${btoa(`${username}:${password}`)}` : undefined;

    try {
      console.log(`🔌 Configuring proxy for ${host}:${port}...`);
      const response = await fetch('/api/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, auth }),
      });

      if (response.ok) {
        console.log('✅ Proxy configured successfully');
      } else {
        const errorData = await response.json().catch(() => ({ error: response.statusText })) as any;
        console.error('❌ Proxy configuration failed:', errorData.error || response.statusText);
        throw new Error(errorData.error || `Proxy configuration failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to configure proxy:', error);
      BaseESPHomeClient.proxyConfigPromise = null; // Allow retry on failure
      throw error;
    }
  }

  /**
   * Make HTTP request to ESPHome device
   */
  protected async request<T>(endpoint: string, method: 'GET' | 'POST' = 'GET'): Promise<T> {
    // Wait for proxy configuration if necessary
    if (this.useProxy && BaseESPHomeClient.proxyConfigPromise) {
      await BaseESPHomeClient.proxyConfigPromise;
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.auth) {
      headers['Authorization'] = this.auth;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      console.error(`Error making request to ${endpoint}:`, error);
      throw error;
    }
  }
}
