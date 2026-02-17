import { z } from 'zod';

export const DocumentMetadataSchema = z.object({
  title: z.string().optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  domain: z.string().optional(),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
