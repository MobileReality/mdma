import { hashValue } from './hash.js';

export interface RedactionContext {
  /** Set of component IDs that have sensitive:true */
  sensitiveComponents: Set<string>;
  /** Set of specific field names that are sensitive */
  sensitiveFields: Set<string>;
}

/** Redact sensitive values in a payload before logging */
export function redactPayload(
  payload: Record<string, unknown>,
  componentId: string,
  ctx: RedactionContext,
): { payload: Record<string, unknown>; redacted: boolean } {
  const isSensitiveComponent = ctx.sensitiveComponents.has(componentId);

  if (!isSensitiveComponent && !hasSensitiveFields(payload, ctx.sensitiveFields)) {
    return { payload, redacted: false };
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (isSensitiveComponent || ctx.sensitiveFields.has(key)) {
      redacted[key] = hashValue(value);
    } else {
      redacted[key] = value;
    }
  }

  return { payload: redacted, redacted: true };
}

function hasSensitiveFields(
  payload: Record<string, unknown>,
  sensitiveFields: Set<string>,
): boolean {
  for (const key of Object.keys(payload)) {
    if (sensitiveFields.has(key)) return true;
  }
  return false;
}
