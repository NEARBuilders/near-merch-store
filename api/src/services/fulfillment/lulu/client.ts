import {
  type LuluCostCalculationRequest,
  type LuluCostCalculationResponse,
  type LuluPrintJobRequest,
  type LuluPrintJobResponse,
  type LuluShippingOption,
  type LuluShippingOptionsRequest,
  type LuluTokenResponse,
} from './types';

interface LuluClientConfig {
  clientKey: string;
  clientSecret: string;
  baseUrl?: string;
  environment?: 'sandbox' | 'production';
}

interface LuluWebhook {
  id: string;
  is_active: boolean;
  topics: string[];
  url: string;
}

export class LuluClient {
  private readonly baseUrl: string;
  private readonly authUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: LuluClientConfig) {
    const environment = config.environment || 'sandbox';
    this.baseUrl =
      config.baseUrl ||
      (environment === 'production' ? 'https://api.lulu.com' : 'https://api.sandbox.lulu.com');
    this.authUrl = `${this.baseUrl}/auth/realms/glasstree/protocol/openid-connect/token`;
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiresAt > Date.now() + 300000) {
      return this.accessToken;
    }

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.config.clientKey}:${this.config.clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Lulu auth failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as LuluTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return data.access_token;
  }

  async request(path: string, init: RequestInit = {}, authenticated = true): Promise<Response> {
    const headers = new Headers(init.headers || {});
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json');
    }

    if (authenticated) {
      headers.set('Authorization', `Bearer ${await this.getAccessToken()}`);
    }

    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });
  }

  async requestJson<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
    const response = await this.request(path, init, authenticated);
    if (!response.ok) {
      throw new Error(`Lulu request failed: ${response.status} ${await response.text()}`);
    }
    return (await response.json()) as T;
  }

  async ping(): Promise<void> {
    await this.getAccessToken();
  }

  async getShippingOptions(input: LuluShippingOptionsRequest): Promise<LuluShippingOption[]> {
    return this.requestJson<LuluShippingOption[]>(
      '/shipping-options/',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      false
    );
  }

  async calculatePrintJobCost(input: LuluCostCalculationRequest): Promise<LuluCostCalculationResponse> {
    return this.requestJson<LuluCostCalculationResponse>('/print-job-cost-calculations/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async createPrintJob(input: LuluPrintJobRequest): Promise<LuluPrintJobResponse> {
    return this.requestJson<LuluPrintJobResponse>('/print-jobs/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getPrintJob(id: string): Promise<LuluPrintJobResponse> {
    return this.requestJson<LuluPrintJobResponse>(`/print-jobs/${id}/`);
  }

  async cancelPrintJob(id: string): Promise<{ name: string }> {
    return this.requestJson<{ name: string }>(`/print-jobs/${id}/status/`, {
      method: 'POST',
      body: JSON.stringify({ name: 'CANCELED' }),
    });
  }

  async createWebhook(url: string): Promise<LuluWebhook> {
    return this.requestJson<LuluWebhook>('/webhooks/', {
      method: 'POST',
      body: JSON.stringify({
        topics: ['PRINT_JOB_STATUS_CHANGED'],
        url,
      }),
    });
  }

  async listWebhooks(): Promise<LuluWebhook[]> {
    return this.requestJson<LuluWebhook[]>('/webhooks/');
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.requestJson(`/webhooks/${id}/`, {
      method: 'DELETE',
    });
  }
}
