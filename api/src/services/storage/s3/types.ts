import { z } from 'every-plugin/zod';

export const S3ConfigSchema = z.object({
  bucket: z.string(),
  region: z.string().default('us-east-1'),
  publicUrl: z.string().optional(),
  endpoint: z.string().optional(),
});

export type S3Config = z.infer<typeof S3ConfigSchema>;