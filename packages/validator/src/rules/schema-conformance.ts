import { componentSchemaRegistry, COMPONENT_TYPES } from '@mobile-reality/mdma-spec';
import type { ValidationRule } from '../types.js';

/** Normalize a string for fuzzy matching: lowercase, strip hyphens/underscores */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[-_]/g, '');
}

/** Simple Levenshtein distance between two strings */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Suggest the closest known component type, if any */
function suggestType(input: string, validTypes: readonly string[]): string {
  const inputNorm = normalize(input);

  // Exact match after normalization (e.g. "approval_gate" → "approval-gate")
  for (const known of validTypes) {
    if (normalize(known) === inputNorm) {
      return ` (did you mean "${known}"?)`;
    }
  }

  // Levenshtein fallback for typos (e.g. "frm" → "form")
  let best = '';
  let bestDist = Number.POSITIVE_INFINITY;
  for (const known of validTypes) {
    const dist = levenshtein(input.toLowerCase(), known);
    if (dist < bestDist && dist <= 2) {
      bestDist = dist;
      best = known;
    }
  }

  return best ? ` (did you mean "${best}"?)` : '';
}

export const schemaConformanceRule: ValidationRule = {
  id: 'schema-conformance',
  name: 'Schema Conformance',
  description: 'Checks that each component conforms to its Zod schema',
  defaultSeverity: 'error',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;
      const type = block.data.type;
      const id = typeof block.data.id === 'string' ? block.data.id : null;

      if (typeof type !== 'string') {
        context.issues.push({
          ruleId: 'schema-conformance',
          severity: 'error',
          message: 'Component must have a "type" string field',
          componentId: id,
          field: 'type',
          blockIndex: block.index,
          fixed: false,
        });
        continue;
      }

      let schema = componentSchemaRegistry.get(type);

      // Fall back to custom schemas for types not in the built-in registry
      if (!schema && context.options.customSchemas?.[type]) {
        schema = context.options.customSchemas[type] as import('zod').ZodType;
      }

      if (!schema) {
        const allValid = [...COMPONENT_TYPES, ...Object.keys(context.options.customSchemas ?? {})];
        const suggestion = suggestType(type, allValid);
        context.issues.push({
          ruleId: 'schema-conformance',
          severity: 'error',
          message: `Unknown component type: "${type}"${suggestion}. Valid types: ${allValid.join(', ')}`,
          componentId: id,
          field: 'type',
          blockIndex: block.index,
          fixed: false,
        });
        continue;
      }

      const result = schema.safeParse(block.data);
      if (!result.success) {
        for (const issue of result.error.issues) {
          context.issues.push({
            ruleId: 'schema-conformance',
            severity: 'error',
            message: `${issue.path.join('.')}: ${issue.message}`,
            componentId: id,
            field: issue.path.join('.'),
            blockIndex: block.index,
            fixed: false,
          });
        }
      }
    }
  },
};
