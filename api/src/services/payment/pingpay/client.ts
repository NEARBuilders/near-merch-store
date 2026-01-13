export interface PingRecipient {
  address: string;
}

export interface PingAsset {
  chain: string;
  symbol: string;
}

export interface CreateCheckoutSessionInput {
  amount: string;
  recipient: PingRecipient;
  asset: PingAsset;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutSessionResponse {
  session: {
    sessionId: string;
    status: string;
    amount: string;
    recipient: string;
    asset: PingAsset;
    createdAt: string;
    expiresAt?: string;
  };
  sessionUrl: string;
}

export interface GetCheckoutSessionResponse {
  session: {
    sessionId: string;
    status: 'CREATED' | 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
    amount: string;
    recipient: string;
    asset: PingAsset;
    paymentId?: string;
    createdAt: string;
    expiresAt?: string;
    metadata?: Record<string, unknown>;
  };
}

export class PingPayClient {
  private baseUrl: string;
  private apiKey?: string;
  private testMode: boolean;

  constructor(baseUrl = 'https://pay.pingpay.io', apiKey?: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.apiKey = apiKey;
    this.testMode = !apiKey || apiKey.startsWith('test_');
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/api${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers as Record<string, string>,
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ping API error: ${response.status} - ${errorBody}`);
    }

    return response.json() as T;
  }

  async ping(): Promise<{ status: 'ok'; timestamp: string }> {
    if (this.testMode) {
      return { status: 'ok', timestamp: new Date().toISOString() };
    }
    return this.request('/ping');
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CheckoutSessionResponse> {
    if (this.testMode) {
      const sessionId = `test_session_${Date.now()}`;
      return {
        session: {
          sessionId,
          status: 'CREATED',
          amount: input.amount,
          recipient: input.recipient.address,
          asset: input.asset,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
        sessionUrl: `https://pay.pingpay.io/checkout/${sessionId}`,
      };
    }
    return this.request('/checkout/sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getCheckoutSession(sessionId: string): Promise<GetCheckoutSessionResponse> {
    if (this.testMode) {
      return {
        session: {
          sessionId,
          status: 'CREATED',
          amount: '1000000',
          recipient: 'test-recipient.near',
          asset: { chain: 'NEAR', symbol: 'USDC' },
          createdAt: new Date().toISOString(),
          metadata: {},
        },
      };
    }
    return this.request(`/checkout/sessions/${sessionId}`);
  }
}
