const BINDING_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_.\-]*)\}\}/g;

export interface BindingReference {
  expression: string;
  path: string;
  componentId: string;
  field: string;
}

/** Extract all {{var}} binding expressions from a component's properties */
export function extractBindings(
  componentId: string,
  obj: unknown,
  field = '',
): BindingReference[] {
  const bindings: BindingReference[] = [];

  if (typeof obj === 'string') {
    const matches = obj.matchAll(BINDING_REGEX);
    for (const match of matches) {
      bindings.push({
        expression: match[0],
        path: match[1],
        componentId,
        field,
      });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      bindings.push(...extractBindings(componentId, item, `${field}[${i}]`));
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const path = field ? `${field}.${key}` : key;
      bindings.push(...extractBindings(componentId, value, path));
    }
  }

  return bindings;
}
