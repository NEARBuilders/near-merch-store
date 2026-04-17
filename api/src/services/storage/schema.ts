import { z } from 'every-plugin/zod';

export const UploadRequestInputSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().default('image/png'),
  prefix: z.string().optional(),
});

export const UploadRequestOutputSchema = z.object({
  presignedUrl: z.string().url(),
  assetId: z.string(),
  publicUrl: z.string().url(),
  key: z.string(),
});

export const SignedUrlInputSchema = z.object({
  key: z.string().min(1),
  expiresIn: z.number().int().positive().max(86400).default(3600),
});

export const SignedUrlOutputSchema = z.object({
  url: z.string().url(),
  expiresIn: z.number(),
});

export const DeleteFileInputSchema = z.object({
  key: z.string().min(1),
});

export const DeleteFileOutputSchema = z.object({
  success: z.boolean(),
});

export const StorageFileSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  size: z.number().optional(),
  contentType: z.string().optional(),
  lastModified: z.string().optional(),
});

export type UploadRequestInput = z.infer<typeof UploadRequestInputSchema>;
export type UploadRequestOutput = z.infer<typeof UploadRequestOutputSchema>;
export type SignedUrlInput = z.infer<typeof SignedUrlInputSchema>;
export type SignedUrlOutput = z.infer<typeof SignedUrlOutputSchema>;
export type DeleteFileInput = z.infer<typeof DeleteFileInputSchema>;
export type DeleteFileOutput = z.infer<typeof DeleteFileOutputSchema>;
export type StorageFile = z.infer<typeof StorageFileSchema>;