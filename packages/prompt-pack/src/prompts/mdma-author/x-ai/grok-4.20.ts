/**
 * MDMA Author Prompt — xAI Grok 4.20 variant.
 *
 * Composition (diverges from grok-4.3 because 4.20 is a reasoning model):
 *
 *   BASE_OPENING (role)
 *     + OUTPUT_FORMAT_BLOCK       (output contract — top, safe for reasoning models)
 *     + BASE_BODY (the spec)
 *     + DOCUMENT_COMPLETENESS_BLOCK (inline — addresses "stops after intro" failure)
 *     + ## Scope Discipline       (negative constraint — end)
 *     + ## Select Option Values   (negative constraint — end)
 *     + BASE_CHECKLIST            (## Self-Check Checklist — end)
 *
 * Why this diverges from grok-4.3's minimal composition:
 *
 * Grok 4.20 is a **reasoning model** — it runs internal chain-of-thought
 * before generating any output, unlike 4.3 which outputs CoT inline. This
 * changes the prompt engineering calculus:
 *
 *   - OUTPUT_FORMAT_BLOCK is safe here. For 4.3, adding output-format
 *     instructions caused "draft then revise" behavior (CoT leaked as
 *     visible output). For 4.20, the draft happens in the hidden reasoning
 *     trace, so the explicit output contract is internalized before the
 *     first visible token.
 *
 *   - The observed 4.20 failure mode is NOT CoT leakage but early
 *     termination: the model emits the thinking block + a heading + a
 *     single intro paragraph, then stops with finishReason "stop" without
 *     ever emitting the requested MDMA component block. The
 *     DOCUMENT_COMPLETENESS_BLOCK is an inline single-use constraint that
 *     tells the model to continue past the intro.
 *
 *   - xAI's own guidance notes that Grok 4.20 has "enhanced instruction
 *     following" that prevents "priority collapse" in longer structured
 *     prompts — so labeled sections at the top are effective here.
 *
 * Routing: substring match on `grok-4.20` (9 chars). Beats the
 * `grok-4.3` 8-char filename for ids with the `4.20` literal; the
 * `grok-4.3` filename does not match a `4.20` id (no `4.3` substring),
 * so there is no collision in the other direction either.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { OUTPUT_FORMAT_BLOCK, SCOPE_DISCIPLINE_BLOCK, SELECT_OPTIONS_BLOCK } from './_shared.js';

const DOCUMENT_COMPLETENESS_BLOCK = `## Document Completeness

Emit the full document in a single response. After the thinking block, continue generating every component the user requested. Do not stop after introductory prose — the response is only complete when the last \`\`\`mdma block is closed.`;

export const MDMA_AUTHOR_PROMPT_GROK_4_20 = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${DOCUMENT_COMPLETENESS_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
