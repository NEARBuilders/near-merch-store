import { z } from 'every-plugin/zod';

export const R2ConfigSchema = z.object({
  bucket: z.string(),
  publicUrl: z.string().optional(),
  endpoint: z.string().optional(),
});

export type R2Config = z.infer<typeof R2ConfigSchema>;