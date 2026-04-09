import { COMPONENT_TYPES } from '@mobile-reality/mdma-spec';

const KNOWN_TYPES = new Set(COMPONENT_TYPES as readonly string[]);

const ANTI_PATTERNS = [
  {
    pattern: /wrap.*(?:markdown|code).*fence|```markdown/i,
    warning: 'Prompt instructs wrapping output in markdown fences — MDMA output should be plain markdown with ```mdma blocks inline',
  },
  {
    pattern: /skip.*thinking|no thinking|without thinking/i,
    warning: 'Prompt instructs skipping thinking blocks — every MDMA response should start with a thinking block',
  },
  {
    pattern: /use JSON|output.*JSON|JSON format/i,
    warning: 'Prompt references JSON output — MDMA components use YAML syntax, not JSON',
  },
  {
    pattern: /camelCase.*id|use camelCase/i,
    warning: 'Prompt references camelCase IDs — MDMA requires kebab-case IDs',
  },
];

export interface PromptConstraints {
  formFieldTypes: string[];
  buttonVariants: string[];
  calloutVariants: string[];
  chartVariants: string[];
  thinkingStatuses: string[];
  webhookMethods: string[];
  fieldNames: Record<string, string>;
  requiredComponentFields: Record<string, string[]>;
}

export interface PromptValidationResult {
  valid: boolean;
  warnings: string[];
  suggestions: string[];
  constraints: PromptConstraints;
}

export function validatePrompt(prompt: string): PromptValidationResult {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check for anti-patterns
  for (const { pattern, warning } of ANTI_PATTERNS) {
    if (pattern.test(prompt)) {
      warnings.push(warning);
    }
  }

  // Check if prompt references at least one valid component type
  const mentionedTypes = [...KNOWN_TYPES].filter((type) =>
    new RegExp(`\\b${type}\\b`, 'i').test(prompt),
  );
  if (mentionedTypes.length === 0) {
    suggestions.push(
      `Prompt does not mention any MDMA component types. Consider referencing: ${[...KNOWN_TYPES].join(', ')}`,
    );
  }

  // Check PII awareness
  const piiTerms = /\b(email|phone|ssn|address|card.?number|passport|date.?of.?birth)\b/i;
  if (piiTerms.test(prompt) && !/sensitive/i.test(prompt)) {
    suggestions.push(
      'Prompt references PII fields but does not mention sensitive: true — consider adding a reminder to mark PII fields as sensitive',
    );
  }

  // Check for mdma code block examples
  if (prompt.includes('```mdma')) {
    // Validate that examples use YAML, not JSON
    const blocks = prompt.match(/```mdma[\s\S]*?```/g) ?? [];
    for (const block of blocks) {
      if (block.includes('"type":') || block.includes('{"')) {
        warnings.push('A ```mdma example in the prompt uses JSON syntax — MDMA blocks must use YAML');
      }
    }
  } else {
    suggestions.push(
      'Prompt does not include any ```mdma code block examples — consider adding at least one example to guide the AI',
    );
  }

  // Check for kebab-case ID convention
  if (/\bid\b/i.test(prompt) && !/kebab/i.test(prompt)) {
    suggestions.push('Prompt mentions IDs but does not reference kebab-case convention');
  }

  const constraints: PromptConstraints = {
    formFieldTypes: ['text', 'number', 'email', 'date', 'select', 'checkbox', 'textarea'],
    buttonVariants: ['primary', 'secondary', 'danger', 'ghost'],
    calloutVariants: ['info', 'warning', 'error', 'success'],
    chartVariants: ['line', 'bar', 'area', 'pie'],
    thinkingStatuses: ['thinking', 'done'],
    webhookMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    fieldNames: {
      'allowedRoles': 'use "allowedRoles" not "roles"',
      'requiredApprovers': 'use "requiredApprovers" not "approvers"',
      'onSubmit': 'use "onSubmit" not "submit" or "onClick"',
      'onAction': 'use "onAction" not "onClick" or "action"',
      'onComplete': 'use "onComplete" not "onDone" or "onFinish"',
      'onApprove': 'use "onApprove" not "onAccept"',
      'onDeny': 'use "onDeny" not "onReject" or "onDecline"',
    },
    requiredComponentFields: {
      form: ['id', 'fields (min 1)'],
      button: ['id', 'text'],
      callout: ['id', 'content'],
      'approval-gate': ['id', 'title'],
      webhook: ['id', 'url', 'trigger'],
      table: ['id', 'columns (min 1)'],
      tasklist: ['id', 'items (min 1)'],
      chart: ['id', 'data'],
      thinking: ['id', 'content'],
    },
  };

  return {
    valid: warnings.length === 0,
    warnings,
    suggestions,
    constraints,
  };
}
