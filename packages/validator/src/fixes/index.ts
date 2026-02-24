import type { FixFunction, ValidationRuleId } from '../types.js';
import { fixIdFormat } from './id-format.js';
import { fixDuplicateIds } from './duplicate-ids.js';
import { fixBindingSyntax } from './binding-syntax.js';
import { fixSensitiveFlags } from './sensitive-flags.js';
import { fixSchemaDefaults } from './schema-defaults.js';
import { fixActionReferences } from './action-references.js';

/** Maps rule IDs to their fix functions. Rules without fixes are absent. */
export const FIX_REGISTRY: Partial<Record<ValidationRuleId, FixFunction>> = {
  'id-format': fixIdFormat,
  'duplicate-ids': fixDuplicateIds,
  'binding-syntax': fixBindingSyntax,
  'sensitive-flags': fixSensitiveFlags,
  'action-references': fixActionReferences,
  'schema-conformance': fixSchemaDefaults,
};

/**
 * Ordered list of fixes to apply.
 *
 * 1. id-format first (ID changes affect cross-references)
 * 2. duplicate-ids second (dedup after format normalization)
 * 3. binding-syntax third
 * 4. sensitive-flags fourth
 * 5. action-references fifth (remove invalid refs before schema check)
 * 6. schema-conformance sixth (re-validates after all fixes, applies Zod defaults)
 * 7. reference-conformance last (applies reference template corrections)
 */
export const FIX_ORDER: ValidationRuleId[] = [
  'id-format',
  'duplicate-ids',
  'binding-syntax',
  'sensitive-flags',
  'action-references',
  'schema-conformance',
];
