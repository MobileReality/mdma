import type { FixContext } from '../types.js';

export function fixBindingSyntax(context: FixContext): void {
  for (const issue of context.issues) {
    if (issue.ruleId !== 'binding-syntax' || issue.fixed) continue;

    const block = context.blocks[issue.blockIndex];
    if (!block?.data) continue;

    // Apply fixes to string values in the block data
    const fixed = fixBindingsInObject(block.data);
    if (fixed) {
      issue.fixed = true;
    }
  }
}

function fixBindingsInObject(obj: Record<string, unknown>): boolean {
  let anyFixed = false;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const fixed = fixBindingString(value);
      if (fixed !== value) {
        obj[key] = fixed;
        anyFixed = true;
      }
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] === 'string') {
          const fixed = fixBindingString(value[i] as string);
          if (fixed !== value[i]) {
            value[i] = fixed;
            anyFixed = true;
          }
        } else if (typeof value[i] === 'object' && value[i] !== null) {
          if (fixBindingsInObject(value[i] as Record<string, unknown>)) {
            anyFixed = true;
          }
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      if (fixBindingsInObject(value as Record<string, unknown>)) {
        anyFixed = true;
      }
    }
  }

  return anyFixed;
}

function fixBindingString(str: string): string {
  let result = str;

  // Fix whitespace in bindings: {{ var.path }} -> {{var.path}}
  result = result.replace(
    /\{\{\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g,
    '{{$1}}',
  );
  result = result.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s+\}\}/g,
    '{{$1}}',
  );

  // Fix single-brace bindings: {var.path} -> {{var.path}}
  // Be careful not to match JSON-like objects or YAML flow mappings
  result = result.replace(
    /(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_.]*)\}(?!\})/g,
    '{{$1}}',
  );

  return result;
}
