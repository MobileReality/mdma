import type { ValidationRule } from '../types.js';

const BINDING_PATTERN = /^\{\{.*\}\}$/s;

function parseCsvHeaders(csv: string): string[] {
  const lines = csv.trim().split('\n');
  if (lines.length === 0) return [];
  return lines[0].split(',').map((h) => h.trim()).filter(Boolean);
}

export const chartValidationRule: ValidationRule = {
  id: 'chart-validation',
  name: 'Chart Validation',
  description:
    'Validates chart data format and axis references against CSV headers',
  defaultSeverity: 'warning',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;
      if (block.data.type !== 'chart') continue;

      const id =
        typeof block.data.id === 'string' ? block.data.id : null;
      const data = block.data.data;

      if (typeof data !== 'string') continue;

      // Skip binding expressions
      if (BINDING_PATTERN.test(data)) continue;

      // Treat as CSV
      const lines = data.trim().split('\n');
      if (lines.length < 2) {
        context.issues.push({
          ruleId: 'chart-validation',
          severity: 'warning',
          message: 'Chart data does not appear to be valid CSV (expected at least a header row and one data row)',
          componentId: id,
          field: 'data',
          blockIndex: block.index,
          fixed: false,
        });
        continue;
      }

      const headers = parseCsvHeaders(data);
      if (headers.length === 0) {
        context.issues.push({
          ruleId: 'chart-validation',
          severity: 'warning',
          message: 'Chart CSV data has no recognizable headers',
          componentId: id,
          field: 'data',
          blockIndex: block.index,
          fixed: false,
        });
        continue;
      }

      const headerSet = new Set(headers);

      // Validate xAxis
      if (typeof block.data.xAxis === 'string' && !headerSet.has(block.data.xAxis)) {
        context.issues.push({
          ruleId: 'chart-validation',
          severity: 'warning',
          message: `xAxis "${block.data.xAxis}" does not match any CSV header (available: ${headers.join(', ')})`,
          componentId: id,
          field: 'xAxis',
          blockIndex: block.index,
          fixed: false,
        });
      }

      // Validate yAxis
      const yAxis = block.data.yAxis;
      const yAxes: string[] = typeof yAxis === 'string'
        ? [yAxis]
        : Array.isArray(yAxis)
          ? yAxis.filter((v): v is string => typeof v === 'string')
          : [];

      for (const axis of yAxes) {
        if (!headerSet.has(axis)) {
          context.issues.push({
            ruleId: 'chart-validation',
            severity: 'warning',
            message: `yAxis "${axis}" does not match any CSV header (available: ${headers.join(', ')})`,
            componentId: id,
            field: 'yAxis',
            blockIndex: block.index,
            fixed: false,
          });
        }
      }
    }
  },
};
