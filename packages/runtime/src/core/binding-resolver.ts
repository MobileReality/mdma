/** Resolve a binding path like "user.profile.name" against a state object */
export function resolveBindingPath(state: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = state;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/** Extract binding path from a {{...}} expression */
export function parseBindingExpression(expr: string): string | null {
  const match = expr.match(/^\{\{([a-zA-Z_][a-zA-Z0-9_.\-]*)\}\}$/);
  return match ? match[1] : null;
}

/** Resolve a value that may be a binding expression or a literal */
export function resolveValue(value: unknown, state: Record<string, unknown>): unknown {
  if (typeof value === 'string') {
    const path = parseBindingExpression(value);
    if (path) {
      return resolveBindingPath(state, path);
    }
  }
  return value;
}
