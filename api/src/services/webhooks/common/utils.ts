/**
 * Shared webhook utilities for common webhook operations
 */

import { Effect } from 'effect';
import crypto from 'node:crypto';

export interface WebhookSignatureVerification {
  signature: string;
  body: string;
  timestamp?: string;
}

export interface OrderLookupResult {
  exists: boolean;
  orderId?: string;
  shouldSkip?: boolean;
  message?: string;
}

export class WebhookError extends Error {
  constructor(
    message: string,
    public code: 'SIGNATURE_INVALID' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'ALREADY_PROCESSED' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

export async function verifyHMACSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const secretBuffer = Buffer.from(secret, 'hex');
  const expected = crypto
    .createHmac('sha256', secretBuffer)
    .update(body)
    .digest('hex');

  if (signature.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

export function parseJSON<T = unknown>(body: string): Effect.Effect<T, Error> {
  return Effect.try({
    try: () => JSON.parse(body) as T,
    catch: (error) => new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`)
  });
}