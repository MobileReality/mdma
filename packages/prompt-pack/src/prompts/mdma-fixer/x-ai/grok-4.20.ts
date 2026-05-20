/**
 * MDMA Fixer Prompt — xAI Grok 4.20 variant.
 *
 * Starting baseline. Grok 4.20 is a reasoning model — internal CoT runs
 * before the first visible token, so the explicit output contract at
 * the top is safe (unlike Grok 4.3 where adding output-format up front
 * caused "draft then revise" behavior).
 *
 * Add inline framing blocks here as failure modes surface during evals.
 * If a reasoning-token leak is observed (visible "Thinking:" preamble),
 * extend the `isGeminiPro` check in `evals/promptfooconfig.fixer.js` to
 * include grok models — same `passthrough.reasoning.exclude` knob works
 * for xAI via OpenRouter.
 *
 * Routing: substring match on `grok-4.20` (9 chars). Beats `grok-4.3`
 * (8 chars) for ids containing the `4.20` literal.
 */

import {
  MDMA_FIXER_APPROVAL,
  MDMA_FIXER_BASE,
  MDMA_FIXER_BINDINGS,
  MDMA_FIXER_EXAMPLES,
  MDMA_FIXER_FLOW,
  MDMA_FIXER_FORMS,
  MDMA_FIXER_PII,
  MDMA_FIXER_STRUCTURE,
  MDMA_FIXER_TABLES_CHARTS,
} from '../_shared.js';
import { OUTPUT_FORMAT_BLOCK, PRESERVE_INPUT_STRUCTURE_BLOCK } from './_shared.js';

/**
 * Reinforces rule 1 of MDMA_FIXER_BASE ("Fix every listed issue").
 * Grok 4.20 consistently fixes some-but-not-all reported errors when a
 * single component has multiple issues — e.g. on the "kitchen sink"
 * employee form it adds \`sensitive: true\` to the email field (one PII
 * fix) but leaves the field without the required \`label\` (a separate
 * schema-conformance error reported on the same field). Same family of
 * failure as gpt-4.1-nano's partial-placeholder fix; the wording here
 * generalizes to ANY required field, not just placeholder text.
 */
const FIX_ALL_LISTED_ERRORS_BLOCK = `## Fix Every Listed Error

!IMPORTANT: The validator may report MULTIPLE errors for the same component (e.g. the same field can have both \`sensitive\` missing AND \`label\` missing). Fix EVERY error, not just the first or most prominent one.

For each component you emit, walk through every error listed for that component and confirm the fix landed. A common partial-fix mistake on Grok 4.20: addressing a PII flag (\`sensitive: true\`) while forgetting an adjacent missing required field (\`label\`).

Before emitting your final output, cross-check each error in the input list against the corresponding field in your output. If any error remains unresolved, fix it.`;

export const MDMA_FIXER_PROMPT_GROK_4_20 = `${OUTPUT_FORMAT_BLOCK}

${MDMA_FIXER_BASE}

${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}

${PRESERVE_INPUT_STRUCTURE_BLOCK}

${FIX_ALL_LISTED_ERRORS_BLOCK}`;
