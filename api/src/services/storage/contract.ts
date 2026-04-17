import { oc } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import {
  UploadRequestInputSchema,
  UploadRequestOutputSchema,
  SignedUrlInputSchema,
  SignedUrlOutputSchema,
  DeleteFileInputSchema,
  DeleteFileOutputSchema,
} from './schema';

export const StorageContract = oc.router({
  ping: oc
    .route({ method: 'GET', path: '/ping' })
    .output(z.object({ provider: z.string(), status: z.literal('ok'), timestamp: z.string().datetime() })),

  requestUpload: oc
    .route({
      method: 'POST',
      path: '/upload',
      summary: 'Request a presigned upload URL',
    })
    .input(UploadRequestInputSchema)
    .output(UploadRequestOutputSchema),

  getSignedUrl: oc
    .route({
      method: 'POST',
      path: '/signed-url',
      summary: 'Get a presigned read URL',
    })
    .input(SignedUrlInputSchema)
    .output(SignedUrlOutputSchema),

  deleteFile: oc
    .route({
      method: 'DELETE',
      path: '/files/{key}',
      summary: 'Delete a stored file',
    })
    .input(DeleteFileInputSchema)
    .output(DeleteFileOutputSchema),
});