import type { ValidationRule, ValidationRuleId } from '../types.js';
import { yamlCorrectnessRule } from './yaml-correctness.js';
import { fieldNameTyposRule } from './field-name-typos.js';
import { schemaConformanceRule } from './schema-conformance.js';
import { duplicateIdsRule } from './duplicate-ids.js';
import { idFormatRule } from './id-format.js';
import { bindingSyntaxRule } from './binding-syntax.js';
// Disabled: binding-resolution checks intra-message bindings but components
// and their bindings are never generated in the same message.
// import { bindingResolutionRule } from './binding-resolution.js';
import { actionReferencesRule } from './action-references.js';
import { sensitiveFlagsRule } from './sensitive-flags.js';
import { requiredMarkersRule } from './required-markers.js';
import { thinkingBlockRule } from './thinking-block.js';
import { tableDataKeysRule } from './table-data-keys.js';
import { selectOptionsRule } from './select-options.js';
import { chartValidationRule } from './chart-validation.js';
import { placeholderContentRule } from './placeholder-content.js';
import { unreferencedComponentsRule } from './unreferenced-components.js';
import { flowOrderingRule } from './flow-ordering.js';

/**
 * Ordered list of all validation rules.
 *
 * Order matters:
 * 1. yaml-correctness runs first (blocks with bad YAML are excluded from later rules)
 * 2. field-name-typos runs before schema-conformance (detects typos before schema fix normalizes them)
 * 3. schema-conformance runs early
 * 4. All other rules run after
 */
export const ALL_RULES: readonly ValidationRule[] = [
  yamlCorrectnessRule,
  fieldNameTyposRule,
  schemaConformanceRule,
  duplicateIdsRule,
  idFormatRule,
  bindingSyntaxRule,
  // bindingResolutionRule,
  actionReferencesRule,
  sensitiveFlagsRule,
  requiredMarkersRule,
  thinkingBlockRule,
  tableDataKeysRule,
  selectOptionsRule,
  chartValidationRule,
  placeholderContentRule,
  unreferencedComponentsRule,
  flowOrderingRule,
];

export function getRulesExcluding(exclude: ValidationRuleId[]): ValidationRule[] {
  const excludeSet = new Set(exclude);
  return ALL_RULES.filter((r) => !excludeSet.has(r.id));
}
