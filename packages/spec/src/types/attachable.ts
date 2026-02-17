import type { z } from 'zod';

export interface AttachableDefinition<TProps = unknown> {
  type: string;
  schema: z.ZodType<TProps>;
  description: string;
  version: string;
}
