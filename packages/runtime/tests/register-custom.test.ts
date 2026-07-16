import { describe, it, expect } from 'vitest';
import type { AttachableDefinition } from '@mobile-reality/mdma-spec';
import { AttachableRegistry, type AttachableHandler } from '../src/attachable/registry.js';
import { registerCustomComponent } from '../src/attachable/register-custom.js';

// The helper stores the schema and registers the handler; it never invokes the
// schema, so a structural stub stands in for a real Zod schema (zod is not a
// runtime dependency).
const stubSchema = { safeParse: () => ({ success: true }) } as unknown as AttachableDefinition['schema'];

function makeHandler(name: string): AttachableHandler {
  return {
    definition: { type: name, schema: stubSchema, description: `${name} variant`, version: '1.0.0' },
  };
}

describe('registerCustomComponent', () => {
  it('registers the handler and props schema under the variant name', () => {
    const attachables = new AttachableRegistry();
    const customSchemas = new Map<string, AttachableDefinition['schema']>();
    const handler = makeHandler('signature-pad');

    registerCustomComponent({ handler }, { attachables, customSchemas });

    expect(attachables.has('signature-pad')).toBe(true);
    expect(attachables.get('signature-pad')).toBe(handler);
    expect(customSchemas.get('signature-pad')).toBe(stubSchema);
  });

  it('registers into only the targets provided', () => {
    const customSchemas = new Map<string, AttachableDefinition['schema']>();
    registerCustomComponent({ handler: makeHandler('map-picker') }, { customSchemas });

    expect(customSchemas.has('map-picker')).toBe(true);
    // No attachables registry passed — nothing to assert there, and no throw.
  });
});
