import type { ValidationRule, ValidationRuleId } from '../types.js';
import { yamlCorrectnessRule } from './yaml-correctness.js';
import { schemaConformanceRule } from './schema-conformance.js';
import { duplicateIdsRule } from './duplicate-ids.js';
import { idFormatRule } from './id-format.js';
import { bindingSyntaxRule } from './binding-syntax.js';
import { bindingResolutionRule } from './binding-resolution.js';
import { actionReferencesRule } from './action-references.js';
import { sensitiveFlagsRule } from './sensitive-flags.js';
import { requiredMarkersRule } from './required-markers.js';
import { thinkingBlockRule } from './thinking-block.js';

/**
 * Ordered list of all validation rules.
 *
 * Order matters:
 * 1. yaml-correctness runs first (blocks with bad YAML are excluded from later rules)
 * 2. schema-conformance runs second
 * 3. All other rules run after
 */
export const ALL_RULES: readonly ValidationRule[] = [
  yamlCorrectnessRule,
  schemaConformanceRule,
  duplicateIdsRule,
  idFormatRule,
  bindingSyntaxRule,
  bindingResolutionRule,
  actionReferencesRule,
  sensitiveFlagsRule,
  requiredMarkersRule,
  thinkingBlockRule,
];

export function getRulesExcluding(
  exclude: ValidationRuleId[],
): ValidationRule[] {
  const excludeSet = new Set(exclude);
  return ALL_RULES.filter((r) => !excludeSet.has(r.id));
}
