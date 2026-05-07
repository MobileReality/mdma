/**
 * MDMA Author Prompt — xAI Grok 4.3 variant.
 *
 * Composition (derived empirically — iteration log below):
 *
 *   BASE_OPENING (role)
 *     + BASE_BODY (the spec)
 *     + ## Scope Discipline       (negative constraint — end)
 *     + ## Select Option Values   (negative constraint — end)
 *     + BASE_CHECKLIST            (## Self-Check Checklist — end)
 *
 * NO `## Output Format` block, NO `## Response Structure` block. Every
 * attempt to add framing on top of the universal base regressed Grok:
 *
 *   - top-anchored OUTPUT_FORMAT_BLOCK only:        8/27 failures
 *   - + "first non-whitespace char must be # / \`\`\`":  17/27 failures
 *     (Grok started visibly "drafting then revising" — emitting first
 *     attempts with typos, then "No, I have to copy it exactly", then
 *     second attempts)
 *   - removed OUTPUT_FORMAT_BLOCK entirely:         2/27 failures (92.59%)
 *   - + a single "## Response Structure" inline block forbidding text
 *     before the first MDMA block:                  13/27 failures
 *
 * The Grok community guidance is literal: "Grok responds unpredictably
 * to pseudo system/persona toggles and long, heavily instrumented prompt
 * headers." Less framing = better behavior. The remaining 2 failures
 * (out of 27) are a chain-of-thought leakage pattern on the most complex
 * blueprint tests — Grok dumps "Thinking: The task is to..." analysis
 * paragraphs before the first MDMA block, and the paragraphs sometimes
 * echo YAML fragments from the user's blueprint that trip
 * [yaml-correctness] validation. Pushing past 92.59% via prompt
 * engineering alone proved counterproductive; further gains likely
 * require an OpenRouter API-level setting (e.g. \`reasoning.exclude\`)
 * which is a deployment concern, not a prompt-pack concern.
 *
 * Routing: substring match on `grok-4.3` (8 chars). Picks this variant
 * for any model id containing the literal `grok-4.3`, including
 * `x-ai/grok-4.3` and any suffix-aliased version.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { SCOPE_DISCIPLINE_BLOCK, SELECT_OPTIONS_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GROK_4_3 = `${BASE_OPENING}

${BASE_BODY}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
