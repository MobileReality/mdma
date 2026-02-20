import { componentSchemaRegistry } from '@mdma/spec';
import type { FixContext } from '../types.js';

export function fixSchemaDefaults(context: FixContext): void {
  for (const block of context.blocks) {
    if (block.data === null) continue;
    const type = block.data.type;
    if (typeof type !== 'string') continue;

    const schema = componentSchemaRegistry.get(type);
    if (!schema) continue;

    // Re-parse with Zod to apply defaults and coercions
    const result = schema.safeParse(block.data);
    if (result.success) {
      // Replace data with the Zod-normalized version (includes defaults)
      block.data = result.data as Record<string, unknown>;

      // Mark relevant schema-conformance issues as fixed
      for (const issue of context.issues) {
        if (
          issue.ruleId === 'schema-conformance' &&
          issue.blockIndex === block.index &&
          !issue.fixed
        ) {
          // Re-check if this specific issue is now resolved
          const recheck = schema.safeParse(block.data);
          if (recheck.success) {
            issue.fixed = true;
          }
        }
      }
    }
  }
}
