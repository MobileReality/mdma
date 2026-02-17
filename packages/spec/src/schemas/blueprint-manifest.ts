import { z } from 'zod';

export const BlueprintMaturitySchema = z.enum(['experimental', 'stable', 'enterprise-ready']);

export type BlueprintMaturity = z.infer<typeof BlueprintMaturitySchema>;

export const BlueprintIntegrationSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  mock: z.boolean().default(true),
});

export const BlueprintChecklistSchema = z.object({
  security: z.array(z.string()).optional(),
  logging: z.array(z.string()).optional(),
  schema: z.array(z.string()).optional(),
  mocks: z.array(z.string()).optional(),
  docs: z.array(z.string()).optional(),
});

export const BlueprintManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string(),
  maturity: BlueprintMaturitySchema,
  description: z.string(),
  outcome: z.string(),
  domain: z.string(),
  components_used: z.array(z.string()),
  integrations: z.array(BlueprintIntegrationSchema).optional(),
  checklists: BlueprintChecklistSchema.optional(),
});

export type BlueprintManifest = z.infer<typeof BlueprintManifestSchema>;
