import { Data } from 'every-plugin/effect';

export class WebhookSignatureError extends Data.TaggedError('WebhookSignatureError')<{
  readonly message: string;
}> {}

export class WebhookParseError extends Data.TaggedError('WebhookParseError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class PingApiError extends Data.TaggedError('PingApiError')<{
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {}

export class CheckoutCreationError extends Data.TaggedError('CheckoutCreationError')<{
  readonly orderId?: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}
