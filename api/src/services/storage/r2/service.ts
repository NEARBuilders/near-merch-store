import { Effect } from 'every-plugin/effect';
import { StorageError } from '../errors';
import type { UploadRequestOutput } from '../schema';
import { R2Client } from './client';

export class R2StorageService {
  private client: R2Client;

  constructor(config: {
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    endpoint: string;
    publicUrl?: string;
  }) {
    this.client = new R2Client(config);
  }

  ping(): Effect.Effect<{ provider: string; status: 'ok'; timestamp: string }, StorageError> {
    return Effect.tryPromise({
      try: async () => ({
        provider: 'r2',
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
      }),
      catch: (e) => new StorageError({
        message: `R2 connection test failed: ${e instanceof Error ? e.message : String(e)}`,
        code: 'SERVICE_UNAVAILABLE',
        provider: 'r2',
        cause: e,
      }),
    });
  }

  requestUpload(input: { filename: string; contentType: string; prefix?: string }): Effect.Effect<UploadRequestOutput, StorageError> {
    return Effect.gen(this, function* () {
      const key = input.prefix
        ? `${input.prefix}/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        : `uploads/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const presignedUrl = yield* Effect.tryPromise({
        try: () => this.client.generatePresignedPutUrl(key, input.contentType),
        catch: (e) => new StorageError({
          message: `Failed to generate presigned upload URL: ${e instanceof Error ? e.message : String(e)}`,
          code: 'UPLOAD_FAILED',
          provider: 'r2',
          cause: e,
        }),
      });

      const publicUrl = this.client.getPublicUrl(key);
      const assetId = key.split('/').pop()!.split('-').slice(1).join('-').replace(/_/g, '-') || key;

      return {
        presignedUrl,
        assetId: `r2-${assetId}`,
        publicUrl,
        key,
      };
    });
  }

  getSignedUrl(input: { key: string; expiresIn?: number }): Effect.Effect<{ url: string; expiresIn: number }, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const url = await this.client.generatePresignedGetUrl(input.key, input.expiresIn ?? 3600);
        return { url, expiresIn: input.expiresIn ?? 3600 };
      },
      catch: (e) => new StorageError({
        message: `Failed to generate signed URL: ${e instanceof Error ? e.message : String(e)}`,
        code: 'NOT_FOUND',
        provider: 'r2',
        cause: e,
      }),
    });
  }

  deleteFile(input: { key: string }): Effect.Effect<{ success: boolean }, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        await this.client.deleteObject(input.key);
        return { success: true };
      },
      catch: (e) => new StorageError({
        message: `Failed to delete file: ${e instanceof Error ? e.message : String(e)}`,
        code: 'UNKNOWN',
        provider: 'r2',
        cause: e,
      }),
    });
  }
}