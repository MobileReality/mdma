import { extractMdmaBlocksFromMarkdown } from './extract-blocks.js';
import { validate } from './validate.js';
import type { ValidationRuleId, ValidationSeverity } from './types.js';

/**
 * A single step definition in the expected conversation flow.
 */
export interface ConversationStep {
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
  /** Expected component ID for the step's primary component */
  id: string;
}

export interface ValidateConversationOptions {
  /** Ordered list of expected conversation steps. */
  steps: ConversationStep[];
  /**
   * Rule IDs to exclude from the per-message validation pass. Forwarded to
   * `validate()` for each message. Same semantics as `validate()`'s `exclude`.
   */
  exclude?: ValidationRuleId[];
}

export interface ValidateConversationIssue {
  /** 0-based message index in the conversation */
  messageIndex: number;
  severity: ValidationSeverity;
  message: string;
  /**
   * Set when the issue was produced by the per-message `validate()` call —
   * identifies which validator rule fired. Absent for issues raised by the
   * multi-step layer itself (step sequence, cross-message regeneration, etc.).
   */
  ruleId?: ValidationRuleId;
  /** Set for per-block issues from `validate()`. */
  componentId?: string | null;
  /** Set for per-block issues from `validate()`. */
  field?: string;
}

export interface ValidateConversationResult {
  /** true if no errors */
  ok: boolean;
  /** All issues found across the conversation */
  issues: ValidateConversationIssue[];
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
 * Validate an entire conversation (sequence of assistant messages) end-to-end.
 *
 * The function runs two passes:
 *
 *   1. Per-message — each assistant message is passed through `validate()`
 *      so every per-block rule fires (yaml-correctness, schema-conformance,
 *      duplicate-ids, sensitive-flags, ...). Per-message issues are surfaced
 *      with their `messageIndex` set.
 *
 *   2. Multi-step — across messages, this function adds checks that
 *      `validate()` cannot see by itself:
 *      - exactly one interactive component per message
 *      - no regenerated component IDs across turns
 *      - step sequence matches the expected `options.steps` definition
 *      - missing steps are surfaced as `info`
 *
 * @param assistantMessages - Assistant message contents in conversation order
 * @param options - Expected flow + optional per-message validation exclusions
 */
export function validateConversation(
  assistantMessages: string[],
  options: ValidateConversationOptions,
): ValidateConversationResult {
  const { steps, exclude } = options;
  const issues: ValidateConversationIssue[] = [];

  // --- Pass 1: per-message validation ---
  for (let msgIdx = 0; msgIdx < assistantMessages.length; msgIdx++) {
    const result = validate(assistantMessages[msgIdx], {
      exclude,
      autoFix: false,
    });
    for (const issue of result.issues) {
      issues.push({
        messageIndex: msgIdx,
        severity: issue.severity,
        message: issue.message,
        ruleId: issue.ruleId,
        componentId: issue.componentId,
        field: issue.field,
      });
    }
  }

  // --- Pass 2: multi-step checks ---
  const seenIds = new Set<string>();
  let currentStepIndex = 0;
  const expectedIds = new Set(steps.map((s) => s.id));
  const expectedTypes = new Set(steps.map((s) => s.type));

  for (let msgIdx = 0; msgIdx < assistantMessages.length; msgIdx++) {
    const components = extractStepComponents(assistantMessages[msgIdx], expectedIds, expectedTypes);

    if (components.length === 0) continue; // pure-text reply is allowed

    if (components.length > 1) {
      issues.push({
        messageIndex: msgIdx,
        severity: 'error',
        message: `Message ${msgIdx + 1} has ${components.length} interactive components (${components
          .map((c) => `${c.type}#${c.id}`)
          .join(', ')}) — expected exactly 1`,
      });
    }

    for (const comp of components) {
      // No regenerated components across messages
      if (seenIds.has(comp.id)) {
        issues.push({
          messageIndex: msgIdx,
          severity: 'error',
          message: `Component "${comp.id}" (${comp.type}) was already shown in a previous message — duplicate step`,
        });
        continue;
      }
      seenIds.add(comp.id);

      // Step sequence
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
