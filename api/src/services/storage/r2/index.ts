import { createPlugin } from 'every-plugin';
import { Effect } from 'every-plugin/effect';
import { ORPCError } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import { StorageContract } from '../contract';
import { StorageError } from '../errors';
import { R2StorageService } from './service';

const mapStorageErrorToORPC = (error: StorageError) => {
  switch (error.code) {
    case 'NOT_FOUND':
      return new ORPCError('NOT_FOUND', { message: error.message, data: { provider: error.provider } });
    case 'UPLOAD_FAILED':
      return new ORPCError('BAD_REQUEST', { message: error.message, data: { provider: error.provider } });
    case 'AUTHENTICATION_FAILED':
      return new ORPCError('UNAUTHORIZED', { message: error.message, data: { provider: error.provider } });
    case 'SERVICE_UNAVAILABLE':
      return new ORPCError('SERVICE_UNAVAILABLE', { message: error.message, data: { provider: error.provider } });
    default:
      return new ORPCError('INTERNAL_SERVER_ERROR', { message: error.message, data: { provider: error.provider } });
  }
};

const wrapHandler = <T>(effect: Effect.Effect<T, StorageError>) =>
  Effect.runPromise(effect.pipe(Effect.mapError(mapStorageErrorToORPC)));

export default createPlugin({
  variables: z.object({
    bucket: z.string(),
    publicUrl: z.string().optional(),
    endpoint: z.string().optional(),
  }),

  secrets: z.object({
    ACCESS_KEY_ID: z.string(),
    SECRET_ACCESS_KEY: z.string(),
  }),

  contract: StorageContract,

  initialize: (config) =>
    Effect.gen(function* () {
      const endpoint = config.variables.endpoint || `https://${config.variables.bucket}.r2.cloudflarestorage.com`;

      const service = new R2StorageService({
        accessKeyId: config.secrets.ACCESS_KEY_ID,
        secretAccessKey: config.secrets.SECRET_ACCESS_KEY,
        bucket: config.variables.bucket,
        endpoint,
        publicUrl: config.variables.publicUrl,
      });

      console.log('[R2 Storage Plugin] Initialized successfully');

      return { service };
    }),

  shutdown: () => Effect.void,

  createRouter: (context, builder) => {
    const { service } = context;

    return {
      ping: builder.ping.handler(async () => wrapHandler(service.ping())),

      requestUpload: builder.requestUpload.handler(async ({ input }) =>
        wrapHandler(service.requestUpload(input))
      ),

      getSignedUrl: builder.getSignedUrl.handler(async ({ input }) =>
        wrapHandler(service.getSignedUrl(input))
      ),

      deleteFile: builder.deleteFile.handler(async ({ input }) =>
        wrapHandler(service.deleteFile(input))
      ),
    };
  },
});

export { R2StorageService } from './service';
export { R2ConfigSchema, type R2Config } from './types';