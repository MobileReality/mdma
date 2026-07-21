import type { ZodType, ZodIssue } from 'zod';
import {
  MdmaComponentSchema,
  componentSchemaRegistry,
  type MdmaComponent,
} from '@mobile-reality/mdma-spec';
import { MdmaParseError } from '../errors/parse-error.js';
import { ErrorCodes } from '../errors/error-codes.js';
import type { Point } from 'unist';

export type ValidateComponentResult =
  | { ok: true; component: MdmaComponent; unknownType?: boolean }
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

  // The `custom` component is a stable envelope; its `name` selects a
  // host-registered props schema. Validate the envelope via the core union,
  // then tighten `props` against the schema registered under `name` when the
  // host supplied one.
  if (type === 'custom') {
    const envelope = MdmaComponentSchema.safeParse(data);
    if (!envelope.success) {
      return {
        ok: false,
        errors: envelope.error.issues.map(
          (issue: ZodIssue) =>
            new MdmaParseError(
              `${issue.path.join('.')}: ${issue.message}`,
              ErrorCodes.SCHEMA_VALIDATION_ERROR,
              position,
            ),
        ),
      };
    }

    const component = envelope.data as Extract<MdmaComponent, { type: 'custom' }>;
    const propsSchema = customSchemas?.get(component.name);
    if (propsSchema) {
      const propsResult = propsSchema.safeParse(component.props);
      if (!propsResult.success) {
        return {
          ok: false,
          errors: propsResult.error.issues.map(
            (issue: ZodIssue) =>
              new MdmaParseError(
                `props.${issue.path.join('.')}: ${issue.message}`,
                ErrorCodes.SCHEMA_VALIDATION_ERROR,
                position,
              ),
          ),
        };
      }
      component.props = propsResult.data as Record<string, unknown>;
    }
    // No schema registered for `name`: pass the envelope through with open
    // props. Strict unknown-name enforcement plugs in here.
    return { ok: true, component };
  }

  // Unknown core type — pass through as a generic component so the renderer
  // can display a proper "Unknown component type" fallback instead of a
  // loading skeleton.
  if (!componentSchemaRegistry.has(type)) {
    return {
      ok: true,
      unknownType: true,
      component: {
        id: typeof data.id === 'string' ? data.id : `unknown-${type}`,
        type,
        ...data,
      } as MdmaComponent,
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
