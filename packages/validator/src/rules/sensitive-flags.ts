import type { ValidationRule, ValidatorOptions } from '../types.js';

const DEFAULT_PII_PATTERNS: RegExp[] = [
  /email|e.?mail|contact/i,
  /phone|tel|mobile|cell/i,
  /ssn|social.?security|national.?id|tax.?id/i,
  /address|street|city|zip|postal/i,
  /account.?num|routing|credit.?card|bank|salary|compensation/i,
  /dob|birth.?date|birthday/i,
  /passport|license|driver.?license/i,
  /patient|medical|health|diagnosis/i,
];

export function getPiiPatterns(options: ValidatorOptions): RegExp[] {
  return [...DEFAULT_PII_PATTERNS, ...(options.customPiiPatterns ?? [])];
}

function matchesPii(value: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(value));
}

export const sensitiveFlagsRule: ValidationRule = {
  id: 'sensitive-flags',
  name: 'Sensitive Flags',
  description: 'Checks that PII fields have sensitive: true',
  defaultSeverity: 'warning',

  validate(context) {
    const patterns = getPiiPatterns(context.options);

    for (const block of context.blocks) {
      if (block.data === null) continue;
      const type = block.data.type;
      const id = typeof block.data.id === 'string' ? block.data.id : null;

      // Check form fields
      if (type === 'form' && Array.isArray(block.data.fields)) {
        for (let i = 0; i < block.data.fields.length; i++) {
          const field = block.data.fields[i] as Record<string, unknown>;
          if (!field || typeof field !== 'object') continue;

          const name = String(field.name ?? '');
          const label = String(field.label ?? '');

          if (
            (matchesPii(name, patterns) || matchesPii(label, patterns)) &&
            field.sensitive !== true
          ) {
            context.issues.push({
              ruleId: 'sensitive-flags',
              severity: 'warning',
              message: `Form field "${name}" appears to contain PII but is missing sensitive: true`,
              componentId: id,
              field: `fields[${i}]`,
              blockIndex: block.index,
              fixed: false,
            });
          }
        }
      }

      // Check table columns
      if (type === 'table' && Array.isArray(block.data.columns)) {
        for (let i = 0; i < block.data.columns.length; i++) {
          const col = block.data.columns[i] as Record<string, unknown>;
          if (!col || typeof col !== 'object') continue;

          const key = String(col.key ?? '');
          const header = String(col.header ?? '');

          if (
            (matchesPii(key, patterns) || matchesPii(header, patterns)) &&
            col.sensitive !== true
          ) {
            context.issues.push({
              ruleId: 'sensitive-flags',
              severity: 'warning',
              message: `Table column "${key}" appears to contain PII but is missing sensitive: true`,
              componentId: id,
              field: `columns[${i}]`,
              blockIndex: block.index,
              fixed: false,
            });
          }
        }
      }
    }
  },
};

export { DEFAULT_PII_PATTERNS };
