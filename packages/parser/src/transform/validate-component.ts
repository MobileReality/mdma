import type { ZodType, ZodIssue } from 'zod';
import {
  MdmaComponentSchema,
  componentSchemaRegistry,
  type MdmaComponent,
} from '@mdma/spec';
import { MdmaParseError } from '../errors/parse-error.js';
import { ErrorCodes } from '../errors/error-codes.js';
import type { Point } from 'unist';

export type ValidateComponentResult =
  | { ok: true; component: MdmaComponent }
  | { ok: false; errors: MdmaParseError[] };

export function validateComponent(
  data: Record<string, unknown>,
  customSchemas?: Map<string, ZodType>,
  position?: { start?: Point; end?: Point },
): ValidateComponentResult {
  const type = data.type;

  if (typeof type !== 'string') {
    return {
      ok: false,
      errors: [
        new MdmaParseError(
          'MDMA component must have a "type" string field',
          ErrorCodes.SCHEMA_VALIDATION_ERROR,
          position,
        ),
      ],
    };
  }

  // Check custom schemas first, then core
  const customSchema = customSchemas?.get(type);
  if (customSchema) {
    const result = customSchema.safeParse(data);
    if (result.success) {
      return { ok: true, component: result.data as MdmaComponent };
    }
    return {
      ok: false,
      errors: result.error.issues.map(
        (issue: ZodIssue) =>
          new MdmaParseError(
            `${issue.path.join('.')}: ${issue.message}`,
            ErrorCodes.SCHEMA_VALIDATION_ERROR,
            position,
          ),
      ),
    };
  }

  // Check if it's a known core type
  if (!componentSchemaRegistry.has(type)) {
    return {
      ok: false,
      errors: [
        new MdmaParseError(
          `Unknown component type: "${type}"`,
          ErrorCodes.UNKNOWN_COMPONENT_TYPE,
          position,
        ),
      ],
    };
  }

  // Validate against the discriminated union
  const result = MdmaComponentSchema.safeParse(data);
  if (result.success) {
    return { ok: true, component: result.data };
  }

  return {
    ok: false,
    errors: result.error.issues.map(
      (issue) =>
        new MdmaParseError(
          `${issue.path.join('.')}: ${issue.message}`,
          ErrorCodes.SCHEMA_VALIDATION_ERROR,
          position,
        ),
    ),
  };
}
