import type { ValidationRule, ValidationIssue } from '../types.js';

const VALID_BINDING_REGEX = /^\{\{[a-zA-Z_][a-zA-Z0-9_.]*\}\}$/;

// Patterns that look like malformed bindings
const SINGLE_BRACE_REGEX = /(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_.]*)\}(?!\})/g;
const WHITESPACE_BINDING_REGEX = /\{\{\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}|\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s+\}\}/g;
const EMPTY_BINDING_REGEX = /\{\{\s*\}\}/g;

function scanForMalformedBindings(
  obj: unknown,
  componentId: string | null,
  blockIndex: number,
  field: string,
  issues: ValidationIssue[],
): void {
  if (typeof obj === 'string') {
    // Check for empty bindings {{ }}
    if (EMPTY_BINDING_REGEX.test(obj)) {
      EMPTY_BINDING_REGEX.lastIndex = 0;
      issues.push({
        ruleId: 'binding-syntax',
        severity: 'error',
        message: `Empty binding expression "{{ }}" in ${field}`,
        componentId,
        field,
        blockIndex,
        fixed: false,
      });
    }

    // Check for whitespace in bindings {{ var.path }}
    WHITESPACE_BINDING_REGEX.lastIndex = 0;
    let wsMatch;
    while ((wsMatch = WHITESPACE_BINDING_REGEX.exec(obj)) !== null) {
      const path = wsMatch[1] ?? wsMatch[2];
      issues.push({
        ruleId: 'binding-syntax',
        severity: 'warning',
        message: `Binding "{{ ${path} }}" has extra whitespace in ${field}. Should be "{{${path}}}"`,
        componentId,
        field,
        blockIndex,
        fixed: false,
      });
    }

    // Check for single-brace bindings {var}
    SINGLE_BRACE_REGEX.lastIndex = 0;
    let singleMatch;
    while ((singleMatch = SINGLE_BRACE_REGEX.exec(obj)) !== null) {
      issues.push({
        ruleId: 'binding-syntax',
        severity: 'warning',
        message: `Possible single-brace binding "{${singleMatch[1]}}" in ${field}. Should be "{{${singleMatch[1]}}}"`,
        componentId,
        field,
        blockIndex,
        fixed: false,
      });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      scanForMalformedBindings(
        item,
        componentId,
        blockIndex,
        `${field}[${i}]`,
        issues,
      );
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      scanForMalformedBindings(
        value,
        componentId,
        blockIndex,
        field ? `${field}.${key}` : key,
        issues,
      );
    }
  }
}

export const bindingSyntaxRule: ValidationRule = {
  id: 'binding-syntax',
  name: 'Binding Syntax',
  description: 'Checks that {{binding}} expressions are well-formed',
  defaultSeverity: 'error',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;
      const id =
        typeof block.data.id === 'string' ? block.data.id : null;

      scanForMalformedBindings(
        block.data,
        id,
        block.index,
        '',
        context.issues,
      );
    }
  },
};

export { VALID_BINDING_REGEX };
