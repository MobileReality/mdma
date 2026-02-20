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
      }
    }
  },
};
