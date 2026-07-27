/**
 * MDMA adapter.
 *
 * Prompt: `buildSystemPrompt()` from `@mobile-reality/mdma-prompt-pack`, with the
 * model-specialized author variant resolved by `evals/select-prompt.mjs` — i.e.
 * exactly what a real integrator gets.
 *
 * Validator: `validate()` from `@mobile-reality/mdma-validator`, `autoFix: false`.
 * Auto-fix is off deliberately: the question is whether the MODEL produced
 * renderable output, not whether our repair layer can rescue it. Turning autofix
 * on would flatter MDMA in a way the other three formats have no equivalent of.
 */

import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { validate } from '@mobile-reality/mdma-validator';
import type { FailureKind, FormatAdapter, ValidationIssue, ValidationResult } from './types.js';

// @ts-expect-error - JS module without types, shared with the promptfoo evals
import { selectAuthorPrompt } from '../../../../evals/select-prompt.mjs';

/**
 * `thinking-block` is excluded to match `evals/assertions/validate-mdma.mjs`:
 * it is a house style rule, not a renderability rule — a document without a
 * thinking block renders perfectly well.
 */
const EXCLUDED_RULES = ['thinking-block'] as const;

/** Map MDMA's rule ids onto the shared cross-format failure taxonomy. */
function classify(ruleId: string): FailureKind {
  switch (ruleId) {
    case 'yaml-correctness':
      return 'parse-error';
    case 'schema-conformance':
    case 'select-options':
    case 'chart-validation':
    case 'table-data-keys':
    case 'required-markers':
    case 'form-submit-action':
      return 'schema-error';
    case 'binding-resolution':
    case 'binding-syntax':
    case 'unreferenced-components':
    case 'duplicate-ids':
    case 'id-format':
      return 'broken-reference';
    case 'html-tags':
      return 'prose-leakage';
    case 'placeholder-content':
      return 'off-task';
    default:
      return 'schema-error';
  }
}

const FENCE = /```mdma\s/;

/** Component types and counts, content stripped — for repeat-consistency. */
function shapeOf(output: string): string {
  const types: string[] = [];
  const blockRe = /```mdma\s+([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(output)) !== null) {
    const typeLine = m[1].match(/^\s*type:\s*(\S+)/m);
    if (typeLine) types.push(typeLine[1]);
  }
  return types.join(',');
}

export const mdmaAdapter: FormatAdapter = {
  id: 'mdma',
  label: 'MDMA',
  promptSource: 'buildSystemPrompt() + per-model author variant (packages/prompt-pack)',

  async systemPrompt(model: string): Promise<string> {
    const { prompt } = await selectAuthorPrompt(model);
    return buildSystemPrompt({ authorPrompt: prompt });
  },

  validate(output: string): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!FENCE.test(output)) {
      // Same taxonomy split applied to A2UI: a model that answers the question
      // in prose, or asks for the real data instead of inventing it, has failed
      // differently from one that emitted malformed structure. Both are
      // failures; separating them keeps the failure table honest and symmetric
      // across formats.
      const askedBack =
        /please (share|provide|specify|confirm)|could you (share|provide|clarify)|I'?ll turn (them|those|it) into|what (data|numbers|values) /i.test(
          output,
        );
      issues.push({
        kind: askedBack ? 'off-task' : 'no-structured-output',
        message: askedBack
          ? 'model asked for the underlying data instead of generating a document'
          : 'no ```mdma block found in the response — answered in prose',
      });
      return { ok: false, issues, componentCount: 0 };
    }

    // An unbalanced fence means the stream stopped mid-block.
    const opens = (output.match(/```mdma/g) ?? []).length;
    const closes = (output.match(/```/g) ?? []).length - opens;
    if (closes < opens) {
      issues.push({ kind: 'truncated', message: 'unclosed ```mdma block' });
      return { ok: false, issues, componentCount: opens };
    }

    const result = validate(output, {
      exclude: [...EXCLUDED_RULES] as never,
      autoFix: false,
    });

    for (const issue of result.issues) {
      if (issue.severity !== 'error' || issue.fixed) continue;
      issues.push({
        kind: classify(issue.ruleId),
        message: `${issue.ruleId}: ${issue.message}`,
      });
    }

    const shape = shapeOf(output);
    return {
      ok: result.ok,
      issues,
      shape,
      componentCount: shape ? shape.split(',').length : 0,
    };
  },
};
