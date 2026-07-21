/**
 * MDMA Author Prompt — xAI Grok 4.5 variant.
 *
 * Composition (minimal, empirically settled):
 *
 *   BASE_OPENING (role)
 *     + BASE_BODY (the spec)
 *     + ## Scope Discipline       (negative constraint — end)
 *     + ## Select Option Values   (negative constraint — end)
 *     + BASE_CHECKLIST            (## Self-Check Checklist — end)
 *
 * NO `## Output Format` block. Iteration log:
 *
 *   - minimal (no output contract):            32/33 — the one failure is a
 *     complex tasklist-gates-button blueprint where Grok leaks a visible
 *     "Thinking: ..." preamble, drafts a first attempt, then restarts,
 *     tripping [yaml-correctness] (unclosed fence).
 *   - + OUTPUT_FORMAT_BLOCK (grok-4.20 remedy): 32/33 — SAME case still fails.
 *     The leaked "Thinking:" preamble and draft-then-revise persisted; the
 *     restart now re-emits a block → [duplicate-ids]. No net benefit.
 *
 * The run reports reasoning tokens, so 4.5 is a hidden-reasoning model like
 * grok-4.20 — yet, unlike 4.20, it still leaks the trace into visible output on
 * the hardest blueprint, and the output contract does not suppress it. This is
 * the exact prompt-resistant leak documented in `grok-4.3.ts`: pushing harder
 * (a "first char must be #" rule) made draft-then-revise WORSE there and is the
 * over-instrumented header pattern xAI's guidance warns against. So we keep the
 * minimal, guidance-aligned baseline and do NOT carry the output contract.
 *
 * The residual failure is API-level, not prompt-level: set OpenRouter
 * `reasoning.exclude` on the provider to drop the reasoning trace from the
 * response body (a deployment / eval-config concern, not a prompt-pack one).
 *
 * SELECT_OPTIONS_BLOCK reinforces the base string-select-value rule the
 * custom-component star-rating scenario depends on; the `custom` envelope docs
 * come from BASE_BODY (all 5 custom cases pass on 4.5).
 *
 * Routing: substring match on `grok-4.5` (normalized `grok-4-5`). Does not
 * collide with `grok-4.3` (`grok-4-3`) or `grok-4.20` (`grok-4-20`) — neither
 * is a substring of a `grok-4-5` id, nor vice versa.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { SCOPE_DISCIPLINE_BLOCK, SELECT_OPTIONS_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GROK_4_5 = `${BASE_OPENING}

${BASE_BODY}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
