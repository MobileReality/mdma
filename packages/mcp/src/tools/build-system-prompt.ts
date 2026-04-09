import { COMPONENT_TYPES } from '@mobile-reality/mdma-spec';

export interface FieldDefinition {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  sensitive?: boolean;
  options?: string[];
}

export interface FlowStep {
  label: string;
  description: string;
}

export interface BuildPromptInput {
  /** Domain context (e.g. "HR onboarding", "expense approval") */
  domain?: string;
  /** Which component types this prompt should use */
  components?: string[];
  /** Form field definitions */
  fields?: FieldDefinition[];
  /** Multi-step flow definitions */
  steps?: FlowStep[];
  /** Business rules or constraints */
  businessRules?: string;
}

const VALID_TYPES = new Set(COMPONENT_TYPES as readonly string[]);

function formatField(f: FieldDefinition): string {
  const parts: string[] = [];
  parts.push(`  - name: ${f.name}`);
  parts.push(`    type: ${f.type}`);
  if (f.label) parts.push(`    label: "${f.label}"`);
  if (f.required) parts.push('    required: true');
  if (f.sensitive) parts.push('    sensitive: true');
  if (f.options?.length) {
    parts.push('    options:');
    for (const o of f.options) {
      parts.push(`      - label: "${o}"`);
      parts.push(`        value: "${o.toLowerCase().replace(/\s+/g, '-')}"`);
    }
  }
  return parts.join('\n');
}

function generateCustomPrompt(input: BuildPromptInput): string {
  const sections: string[] = [];

  // Role & domain
  if (input.domain) {
    sections.push(
      `## Role & Domain\n\nYou are an AI assistant for **${input.domain}**. Generate interactive MDMA documents that help users complete this workflow. Be specific to this domain — use relevant terminology, realistic field names, and appropriate validation.`,
    );
  }

  // Components
  if (input.components?.length) {
    const valid = input.components.filter((c) => VALID_TYPES.has(c));
    const invalid = input.components.filter((c) => !VALID_TYPES.has(c));

    sections.push(
      `## Allowed Components\n\nYou MUST only use these component types: **${valid.join(', ')}**.\nDo NOT generate components of any other type.${invalid.length ? `\n\n> Note: "${invalid.join('", "')}" are not valid MDMA types and were excluded.` : ''}`,
    );
  }

  // Fields with YAML example
  if (input.fields?.length) {
    const fieldYaml = input.fields.map(formatField).join('\n');
    const formId = input.domain
      ? `${input.domain.toLowerCase().replace(/\s+/g, '-')}-form`
      : 'main-form';

    sections.push(
      `## Form Structure\n\nThe primary form must include exactly these fields:\n\n\`\`\`mdma\ntype: form\nid: ${formId}\nfields:\n${fieldYaml}\n\`\`\`\n\nReproduce this structure exactly. Do not add or remove fields.`,
    );
  }

  // Flow steps
  if (input.steps?.length) {
    const stepLines = input.steps
      .map((s, i) => `**Step ${i + 1}: ${s.label}**\n${s.description}`)
      .join('\n\n');

    sections.push(
      `## Conversation Flow\n\nThis is a ${input.steps.length}-step workflow. Each step MUST be generated in a SEPARATE conversation message — never combine multiple steps in one message.\n\n${stepLines}\n\nWhen the user submits or completes a step, generate ONLY the next step. Do not regenerate previous steps.`,
    );
  }

  // Business rules
  if (input.businessRules) {
    sections.push(`## Business Rules\n\n${input.businessRules}`);
  }

  // Constraints reminder
  const constraints: string[] = [];
  if (input.fields?.some((f) => f.sensitive)) {
    constraints.push('All PII fields listed above MUST have `sensitive: true`');
  }
  if (input.fields?.some((f) => f.type === 'select')) {
    constraints.push('All select fields MUST include `options` with `{label, value}` objects');
  }
  if (input.steps && input.steps.length > 1) {
    constraints.push('Each workflow step = one conversation message. Never combine steps.');
  }
  if (constraints.length) {
    sections.push(`## Constraints\n\n${constraints.map((c) => `- ${c}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

export function buildPrompt(input: BuildPromptInput): string {
  const hasStructuredInput =
    input.domain ||
    input.components?.length ||
    input.fields?.length ||
    input.steps?.length ||
    input.businessRules;

  if (!hasStructuredInput) {
    return '';
  }

  return generateCustomPrompt(input);
}
