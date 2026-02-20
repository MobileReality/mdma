import { componentSchemaRegistry } from '@mdma/spec';
import type { ValidationRule } from '../types.js';

export const schemaConformanceRule: ValidationRule = {
  id: 'schema-conformance',
  name: 'Schema Conformance',
  description: 'Checks that each component conforms to its Zod schema',
  defaultSeverity: 'error',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;
      const type = block.data.type;
      const id =
        typeof block.data.id === 'string' ? block.data.id : null;

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

      const schema = componentSchemaRegistry.get(type);
      if (!schema) {
        context.issues.push({
          ruleId: 'schema-conformance',
          severity: 'error',
          message: `Unknown component type: "${type}"`,
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
