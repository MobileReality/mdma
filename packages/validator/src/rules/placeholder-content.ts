import type { ValidationRule } from '../types.js';

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /^\.{3,}$/,
  /^(TODO|TBD|FIXME|placeholder|lorem\s*ipsum|example|sample)\b/i,
];

const TOP_LEVEL_FIELDS = ['content', 'title', 'label', 'text', 'description'];

function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  return PLACEHOLDER_PATTERNS.some((p) => p.test(trimmed));
}

export const placeholderContentRule: ValidationRule = {
  id: 'placeholder-content',
  name: 'Placeholder Content',
  description:
    'Warns when fields contain placeholder or stub content (TODO, TBD, "...", etc.)',
  defaultSeverity: 'info',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;

      const id =
        typeof block.data.id === 'string' ? block.data.id : null;

      // Check top-level fields
      for (const field of TOP_LEVEL_FIELDS) {
        const value = block.data[field];
        if (typeof value === 'string' && isPlaceholder(value)) {
          context.issues.push({
            ruleId: 'placeholder-content',
            severity: 'info',
            message: `Field "${field}" contains placeholder content: "${value}"`,
            componentId: id,
            field,
            blockIndex: block.index,
            fixed: false,
          });
        }
      }

      // Check form fields[].label
      if (block.data.type === 'form' && Array.isArray(block.data.fields)) {
        for (let i = 0; i < block.data.fields.length; i++) {
          const f = block.data.fields[i];
          if (typeof f !== 'object' || f === null) continue;
          if (typeof f.label === 'string' && isPlaceholder(f.label)) {
            context.issues.push({
              ruleId: 'placeholder-content',
              severity: 'info',
              message: `Form field label contains placeholder content: "${f.label}"`,
              componentId: id,
              field: `fields[${i}].label`,
              blockIndex: block.index,
              fixed: false,
            });
          }
        }
      }

      // Check table columns[].header
      if (block.data.type === 'table' && Array.isArray(block.data.columns)) {
        for (let i = 0; i < block.data.columns.length; i++) {
          const col = block.data.columns[i];
          if (typeof col !== 'object' || col === null) continue;
          if (typeof col.header === 'string' && isPlaceholder(col.header)) {
            context.issues.push({
              ruleId: 'placeholder-content',
              severity: 'info',
              message: `Table column header contains placeholder content: "${col.header}"`,
              componentId: id,
              field: `columns[${i}].header`,
              blockIndex: block.index,
              fixed: false,
            });
          }
        }
      }
    }
  },
};
