import type { DataSourceDescriptor } from '@mobile-reality/mdma-spec';
import type { ValidationRule, ValidationRuleContext } from '../types.js';

interface RefLike {
  source: string;
  params?: Record<string, unknown>;
}

function isBindingExpression(value: string): boolean {
  return /^\{\{.+\}\}$/.test(value);
}

function asObjectRef(value: unknown): RefLike | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.source !== 'string') return null;
  return candidate as unknown as RefLike;
}

/** Form `options` also accepts a bare string as a source-name shorthand — but never a
 *  `{{binding}}`, which is a live reference, not a source name. `table.data`/`chart.data`
 *  never take a plain string as a ref: there it is inline CSV or a binding. */
function asOptionsRef(value: unknown): RefLike | null {
  if (typeof value === 'string') return isBindingExpression(value) ? null : { source: value };
  return asObjectRef(value);
}

function checkRef(
  context: ValidationRuleContext,
  ref: RefLike,
  componentId: string | null,
  field: string,
  blockIndex: number,
): DataSourceDescriptor | undefined {
  if (ref.source.trim() === '') {
    context.issues.push({
      ruleId: 'data-source',
      severity: 'error',
      message: 'Data source ref is missing a "source" name',
      componentId,
      field,
      blockIndex,
      fixed: false,
    });
    return undefined;
  }

  const catalog = context.options.dataSourceCatalog;
  if (!catalog) return undefined;

  const descriptor = catalog[ref.source];
  if (!descriptor) {
    context.issues.push({
      ruleId: 'data-source',
      severity: 'error',
      message: `Unknown data source "${ref.source}"`,
      componentId,
      field,
      blockIndex,
      fixed: false,
    });
    return undefined;
  }

  const params = ref.params ?? {};
  for (const paramDesc of descriptor.params ?? []) {
    if (paramDesc.required && !(paramDesc.name in params)) {
      context.issues.push({
        ruleId: 'data-source',
        severity: 'error',
        message: `Data source "${ref.source}" is missing required param "${paramDesc.name}"`,
        componentId,
        field,
        blockIndex,
        fixed: false,
      });
      continue;
    }
    const value = params[paramDesc.name];
    if (
      paramDesc.allowed &&
      typeof value !== 'undefined' &&
      typeof value === 'string' &&
      !isBindingExpression(value) &&
      !paramDesc.allowed.includes(value)
    ) {
      context.issues.push({
        ruleId: 'data-source',
        severity: 'error',
        message: `Data source "${ref.source}" param "${paramDesc.name}" value "${String(value)}" is not one of the allowed values`,
        componentId,
        field,
        blockIndex,
        fixed: false,
      });
    }
  }

  return descriptor;
}

export const dataSourceRule: ValidationRule = {
  id: 'data-source',
  name: 'Data Source',
  description:
    'Checks form/table/chart data source refs ({ source, params }) for syntax and, when a catalog is provided, against it',
  defaultSeverity: 'error',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;
      const id = typeof block.data.id === 'string' ? block.data.id : null;

      if (block.data.type === 'form' && Array.isArray(block.data.fields)) {
        block.data.fields.forEach((field, i) => {
          if (typeof field !== 'object' || field === null) return;
          const ref = asOptionsRef((field as Record<string, unknown>).options);
          if (!ref) return;
          checkRef(context, ref, id, `fields[${i}].options`, block.index);
        });
      }

      if (block.data.type === 'table') {
        const ref = asObjectRef(block.data.data);
        if (ref) {
          const descriptor = checkRef(context, ref, id, 'data', block.index);
          if (descriptor?.columns) {
            const sourceKeys = new Set(descriptor.columns.map((c) => c.key));
            const columns = Array.isArray(block.data.columns) ? block.data.columns : [];
            for (const col of columns) {
              if (typeof col !== 'object' || col === null) continue;
              const key = (col as Record<string, unknown>).key;
              if (typeof key === 'string' && !sourceKeys.has(key)) {
                context.issues.push({
                  ruleId: 'data-source',
                  severity: 'error',
                  message: `Column "${key}" is not provided by data source "${ref.source}"`,
                  componentId: id,
                  field: 'columns',
                  blockIndex: block.index,
                  fixed: false,
                });
              }
            }
          }
        }
      }

      if (block.data.type === 'chart') {
        const ref = asObjectRef(block.data.data);
        if (ref) {
          const descriptor = checkRef(context, ref, id, 'data', block.index);
          if (descriptor?.columns) {
            const sourceKeys = new Set(descriptor.columns.map((c) => c.key));
            const axisKeys: Array<[string, unknown]> = [
              ['xAxis', block.data.xAxis],
              ['yAxis', block.data.yAxis],
            ];
            for (const [field, value] of axisKeys) {
              const keys = Array.isArray(value) ? value : value ? [value] : [];
              for (const k of keys) {
                if (typeof k === 'string' && !sourceKeys.has(k)) {
                  context.issues.push({
                    ruleId: 'data-source',
                    severity: 'error',
                    message: `"${field}" key "${k}" is not provided by data source "${ref.source}"`,
                    componentId: id,
                    field,
                    blockIndex: block.index,
                    fixed: false,
                  });
                }
              }
            }
          }
        }
      }
    }
  },
};
