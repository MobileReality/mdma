import type { ValidationRule } from '../types.js';

export const tableDataKeysRule: ValidationRule = {
  id: 'table-data-keys',
  name: 'Table Data Keys',
  description:
    'Checks that table data row keys match defined column keys',
  defaultSeverity: 'warning',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;
      if (block.data.type !== 'table') continue;

      const columns = block.data.columns;
      const data = block.data.data;

      if (!Array.isArray(columns) || !Array.isArray(data)) continue;

      const id =
        typeof block.data.id === 'string' ? block.data.id : null;

      const columnKeys = new Set<string>();
      for (const col of columns) {
        if (typeof col === 'object' && col !== null && typeof col.key === 'string') {
          columnKeys.add(col.key);
        }
      }

      if (columnKeys.size === 0) continue;

      // Track which columns have at least one matching data key
      const matchedColumns = new Set<string>();
      const reportedExtraKeys = new Set<string>();

      for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx];
        if (typeof row !== 'object' || row === null) continue;

        for (const key of Object.keys(row)) {
          if (columnKeys.has(key)) {
            matchedColumns.add(key);
          } else if (!reportedExtraKeys.has(key)) {
            reportedExtraKeys.add(key);
            context.issues.push({
              ruleId: 'table-data-keys',
              severity: 'warning',
              message: `Data key "${key}" does not match any column (defined columns: ${[...columnKeys].join(', ')})`,
              componentId: id,
              field: `data[${rowIdx}].${key}`,
              blockIndex: block.index,
              fixed: false,
            });
          }
        }
      }

      // Warn about columns with no matching data
      for (const colKey of columnKeys) {
        if (!matchedColumns.has(colKey) && data.length > 0) {
          context.issues.push({
            ruleId: 'table-data-keys',
            severity: 'warning',
            message: `Column "${colKey}" has no matching keys in any data row`,
            componentId: id,
            field: `columns`,
            blockIndex: block.index,
            fixed: false,
          });
        }
      }
    }
  },
};
