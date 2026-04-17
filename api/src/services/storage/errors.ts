import { Data } from 'every-plugin/effect';

export type StorageErrorCode =
  | 'UPLOAD_FAILED'
  | 'NOT_FOUND'
  | 'SERVICE_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION_FAILED'
  | 'UNKNOWN';

export class StorageError extends Data.TaggedError('StorageError')<{
  readonly message: string;
  readonly code: StorageErrorCode;
  readonly provider: string;
  readonly cause?: unknown;
}> {}