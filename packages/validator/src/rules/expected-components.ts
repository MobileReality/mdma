import type { ValidationRule } from '../types.js';

export const expectedComponentsRule: ValidationRule = {
  id: 'expected-components',
  name: 'Expected Components',
  description:
    'Checks that expected components were generated with the correct type, fields, and columns',
  defaultSeverity: 'error',

  validate(context) {
    const expected = context.options.expectedComponents;
    if (!expected) return;

    for (const [expectedId, spec] of Object.entries(expected)) {
      const blockIndex = context.idMap.get(expectedId);

      // 1. Does the component exist?
      if (blockIndex === undefined) {
        context.issues.push({
          ruleId: 'expected-components',
          severity: 'error',
          message: `Expected component "${expectedId}" (${spec.type}) was not generated`,
          componentId: expectedId,
          blockIndex: -1,
          fixed: false,
        });
        continue;
      }

      const block = context.blocks[blockIndex];
      if (!block?.data) continue;

      // 2. Is it the correct type?
      if (block.data.type !== spec.type) {
        context.issues.push({
          ruleId: 'expected-components',
          severity: 'error',
          message: `Component "${expectedId}" has type "${block.data.type}" but expected "${spec.type}"`,
          componentId: expectedId,
          field: 'type',
          blockIndex,
          fixed: false,
        });
      }

      // 3. For forms — check expected fields
      if (spec.fields && spec.fields.length > 0) {
        const actualFields = new Set<string>();
        if (Array.isArray(block.data.fields)) {
          for (const f of block.data.fields) {
            if (typeof f === 'object' && f !== null && typeof f.name === 'string') {
              actualFields.add(f.name);
            }
          }
        }

        for (const expectedField of spec.fields) {
          if (!actualFields.has(expectedField)) {
            const available =
              actualFields.size > 0 ? ` (available: ${[...actualFields].join(', ')})` : '';
            context.issues.push({
              ruleId: 'expected-components',
              severity: 'error',
              message: `Component "${expectedId}" is missing expected field "${expectedField}"${available}`,
              componentId: expectedId,
              field: 'fields',
              blockIndex,
              fixed: false,
            });
          }
        }
      }

      // 4. For tables — check expected columns
      if (spec.columns && spec.columns.length > 0) {
        const actualColumns = new Set<string>();
        if (Array.isArray(block.data.columns)) {
          for (const col of block.data.columns) {
            if (typeof col === 'object' && col !== null && typeof col.key === 'string') {
              actualColumns.add(col.key);
            }
          }
        }

        for (const expectedCol of spec.columns) {
          if (!actualColumns.has(expectedCol)) {
            const available =
              actualColumns.size > 0 ? ` (available: ${[...actualColumns].join(', ')})` : '';
            context.issues.push({
              ruleId: 'expected-components',
              severity: 'error',
              message: `Component "${expectedId}" is missing expected column "${expectedCol}"${available}`,
              componentId: expectedId,
              field: 'columns',
              blockIndex,
              fixed: false,
            });
          }
        }
      }
    }
  },
};
