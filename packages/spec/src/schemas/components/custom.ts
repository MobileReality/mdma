import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';

/**
 * A host-extensible component. `custom` is a stable envelope that core always
 * understands; the `name` selects which host-registered variant to render and
 * validate. `props` is intentionally open so the schema stays maximally
 * flexible — a host tightens it per `name` by registering a props schema (see
 * the parser's `customSchemas`), and describes it to the model via the prompt
 * catalog. Presentation lives entirely in the host renderer, never here.
 */
export const CustomComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('custom'),
  name: z.string().min(1).describe('Registered custom component variant, e.g. "signature-pad"'),
  props: z
    .record(z.unknown())
    .default({})
    .describe('Intent payload for the variant; validated per `name` by the host'),
  actions: z
    .record(z.string())
    .optional()
    .describe('Maps a variant event (e.g. "onCapture") to an action label'),
});

export type CustomComponent = z.infer<typeof CustomComponentSchema>;
