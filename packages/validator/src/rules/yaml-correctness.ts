import type { ValidationRule } from '../types.js';

export const yamlCorrectnessRule: ValidationRule = {
  id: 'yaml-correctness',
  name: 'YAML Correctness',
  description: 'Checks that all mdma blocks contain valid YAML that parses to an object',
  defaultSeverity: 'error',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) {
        context.issues.push({
          ruleId: 'yaml-correctness',
          severity: 'error',
          message: block.parseError ?? 'Invalid YAML in mdma block',
          componentId: null,
          blockIndex: block.index,
          fixed: false,
        });
      } else if (block.splitFrom != null) {
        // Block was split from a multi-component fenced block
        context.issues.push({
          ruleId: 'yaml-correctness',
          severity: 'warning',
          message: 'Multiple components in one mdma block were split into separate blocks',
          componentId:
            typeof block.data.id === 'string' ? block.data.id : null,
          blockIndex: block.index,
          fixed: true,
        });
      } else if (block.yamlSanitized) {
        // Block parsed only after stripping --- separators
        context.issues.push({
          ruleId: 'yaml-correctness',
          severity: 'warning',
          message: 'YAML document separator "---" was stripped to fix parsing',
          componentId:
            typeof block.data.id === 'string' ? block.data.id : null,
          blockIndex: block.index,
          fixed: true,
        });
      }
    }
  },
};
