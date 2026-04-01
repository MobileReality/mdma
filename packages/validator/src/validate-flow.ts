import { extractMdmaBlocksFromMarkdown } from './extract-blocks.js';

/**
 * A single step definition in the expected flow.
 */
export interface FlowStepDefinition {
  /** Human-readable step label (e.g. "Registration Form") */
  label: string;
  /** The primary component type for this step */
  type:
    | 'form'
    | 'button'
    | 'tasklist'
    | 'approval-gate'
    | 'webhook'
    | 'callout'
    | 'table'
    | 'chart';
  /** Expected component ID for the interactive component */
  id: string;
}

export interface FlowValidationOptions {
  /** Ordered list of expected flow steps. */
  steps: FlowStepDefinition[];
}

export interface FlowValidationResult {
  /** true if no errors */
  ok: boolean;
  /** All issues found across the conversation */
  issues: FlowValidationIssue[];
}

export interface FlowValidationIssue {
  /** 0-based message index in the conversation */
  messageIndex: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

/**
 * Extract primary components from a markdown message.
 * Returns all components whose type or ID matches an expected step.
 */
function extractStepComponents(
  markdown: string,
  expectedIds: Set<string>,
  expectedTypes: Set<string>,
): Array<{ id: string; type: string }> {
  const blocks = extractMdmaBlocksFromMarkdown(markdown);
  const result: Array<{ id: string; type: string }> = [];
  for (const block of blocks) {
    if (!block.data) continue;
    const type = block.data.type;
    const id = block.data.id;
    if (typeof type === 'string' && typeof id === 'string') {
      if (expectedIds.has(id) || expectedTypes.has(type)) {
        result.push({ id, type });
      }
    }
  }
  return result;
}

/**
 * Validate an entire conversation flow against expected step definitions.
 *
 * Takes all assistant messages in order and checks:
 * 1. Each message contains exactly one interactive component
 * 2. Steps follow the expected order
 * 3. No step is duplicated
 * 4. Component IDs match the expected definitions
 *
 * @param assistantMessages - Assistant message contents in conversation order
 * @param options - Expected flow definition
 */
export function validateFlow(
  assistantMessages: string[],
  options: FlowValidationOptions,
): FlowValidationResult {
  const { steps } = options;
  const issues: FlowValidationIssue[] = [];
  const seenIds = new Set<string>();
  let currentStepIndex = 0;

  const expectedIds = new Set(steps.map((s) => s.id));
  const expectedTypes = new Set(steps.map((s) => s.type));

  for (let msgIdx = 0; msgIdx < assistantMessages.length; msgIdx++) {
    const components = extractStepComponents(assistantMessages[msgIdx], expectedIds, expectedTypes);

    // Skip messages with no interactive components (e.g. pure text responses)
    if (components.length === 0) continue;

    // Check: exactly one interactive component per message
    if (components.length > 1) {
      issues.push({
        messageIndex: msgIdx,
        severity: 'error',
        message: `Message ${msgIdx + 1} has ${components.length} interactive components (${components.map((c) => `${c.type}#${c.id}`).join(', ')}) — expected exactly 1`,
      });
    }

    for (const comp of components) {
      // Check: no duplicates across messages
      if (seenIds.has(comp.id)) {
        issues.push({
          messageIndex: msgIdx,
          severity: 'error',
          message: `Component "${comp.id}" (${comp.type}) was already shown in a previous message — duplicate step`,
        });
        continue;
      }
      seenIds.add(comp.id);

      // Check: matches expected step
      if (currentStepIndex < steps.length) {
        const expected = steps[currentStepIndex];

        if (comp.id !== expected.id) {
          issues.push({
            messageIndex: msgIdx,
            severity: 'error',
            message: `Expected step ${currentStepIndex + 1} "${expected.label}" with ${expected.type}#${expected.id}, but got ${comp.type}#${comp.id}`,
          });
        } else if (comp.type !== expected.type) {
          issues.push({
            messageIndex: msgIdx,
            severity: 'error',
            message: `Step ${currentStepIndex + 1} "${expected.label}" has wrong type: expected ${expected.type}, got ${comp.type}`,
          });
        } else {
          issues.push({
            messageIndex: msgIdx,
            severity: 'info',
            message: `Step ${currentStepIndex + 1} "${expected.label}" — correct (${comp.type}#${comp.id})`,
          });
        }

        currentStepIndex++;
      } else {
        issues.push({
          messageIndex: msgIdx,
          severity: 'warning',
          message: `Unexpected extra step: ${comp.type}#${comp.id} — all ${steps.length} expected steps already completed`,
        });
      }
    }
  }

  // Check: all steps were shown
  if (currentStepIndex < steps.length) {
    for (let i = currentStepIndex; i < steps.length; i++) {
      issues.push({
        messageIndex: assistantMessages.length - 1,
        severity: 'info',
        message: `Step ${i + 1} "${steps[i].label}" (${steps[i].type}#${steps[i].id}) not yet shown`,
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  return { ok: !hasErrors, issues };
}
