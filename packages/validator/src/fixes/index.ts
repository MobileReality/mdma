import type { FixFunction, ValidationRuleId } from '../types.js';
import { fixIdFormat } from './id-format.js';
import { fixDuplicateIds } from './duplicate-ids.js';
import { fixBindingSyntax } from './binding-syntax.js';
import { fixSensitiveFlags } from './sensitive-flags.js';
import { fixSchemaDefaults } from './schema-defaults.js';
import { fixActionReferences } from './action-references.js';
import { fixThinkingBlock } from './thinking-block.js';

/** Maps rule IDs to their fix functions. Rules without fixes are absent. */
export const FIX_REGISTRY: Partial<Record<ValidationRuleId, FixFunction>> = {
  'id-format': fixIdFormat,
  'duplicate-ids': fixDuplicateIds,
  'binding-syntax': fixBindingSyntax,
  'sensitive-flags': fixSensitiveFlags,
  'action-references': fixActionReferences,
  'schema-conformance': fixSchemaDefaults,
  'thinking-block': fixThinkingBlock,
};

/**
 * Ordered list of fixes to apply.
 *
 * 1. thinking-block first (merge + reorder before any other fixes)
 * 2. id-format (ID changes affect cross-references)
 * 3. duplicate-ids (dedup after format normalization)
 * 4. binding-syntax
 * 5. sensitive-flags
 * 6. action-references (remove invalid refs before schema check)
 * 7. schema-conformance last (re-validates after all fixes, applies Zod defaults)
 */
export const FIX_ORDER: ValidationRuleId[] = [
  'thinking-block',
  'id-format',
  'duplicate-ids',
  'binding-syntax',
  'sensitive-flags',
  'action-references',
  'schema-conformance',
];
