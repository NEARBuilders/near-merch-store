export interface PingParty {
  address: string;
  chainId: string;
}

export interface PingAssetAmount {
  assetId: string;
  amount: string;
}

export interface PingTheme {
  brandColor?: string;
  logoUrl?: string;
  buttonText?: string;
}

export interface CreateCheckoutSessionInput {
  amount: PingAssetAmount;
  recipient: PingParty;
  theme?: PingTheme;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

export interface CheckoutSession {
  sessionId: string;
  status: 'CREATED' | 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  paymentId: string | null;
  amount: PingAssetAmount;
  recipient: PingParty;
  theme?: PingTheme;
  successUrl?: string;
  cancelUrl?: string;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface CreateCheckoutSessionResponse {
  session: CheckoutSession;
  sessionUrl: string;
}

export interface GetCheckoutSessionResponse {
  session: CheckoutSession;
}

export class PingPayClient {
  private baseUrl: string;

  constructor(baseUrl = 'https://pay.pingpay.io') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ping API error: ${response.status} - ${errorBody}`);
    }

    return response.json() as T;
  }

  async ping(): Promise<{ status: 'ok'; timestamp: string }> {
    return this.request('/ping');
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionResponse> {
    return this.request('/checkout/sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getCheckoutSession(sessionId: string): Promise<GetCheckoutSessionResponse> {
    return this.request(`/checkout/sessions/${sessionId}`);
  }
}
