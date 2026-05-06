/**
 * MDMA Author Prompt — Google Gemini 3.1 Pro (Preview) variant.
 *
 * Composition (Gemini-native ordering):
 *
 *   BASE_OPENING (role)
 *     + ## Output Format          (behavioral directive, top — anchor)
 *     + BASE_BODY (the spec)
 *     + ## Scope Discipline       (negative constraint — end)
 *     + ## Select Option Values   (negative constraint — end)
 *     + BASE_CHECKLIST            (## Self-Check Checklist — end)
 *
 * Why this ordering — Google's Gemini 3 prompting guides distinguish two
 * placement rules:
 *
 * 1. Phil Schmid's Google guide
 *    (https://www.philschmid.de/gemini-3-prompt-practices): "Place
 *    behavioral constraints and role definitions in the System Instruction
 *    or at the very top of the prompt to ensure they anchor the model's
 *    reasoning process." → role + output-format directive at top.
 *
 * 2. Vertex official guide
 *    (https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide):
 *    "negative constraints should be placed at the end of the instruction."
 *    → scope-discipline + select-option-values rules at the end.
 *
 * 3. "Use either XML-style tagging OR Markdown consistently — mixing them
 *    confuses the model." → framing blocks are Markdown headings, not
 *    XML tags. (OpenAI/Anthropic variants stick with their
 *    vendor-recommended XML scaffolding.)
 *
 * Earlier revision regression: an experimental version put the
 * output-format directive as the LITERAL final line of the prompt. That
 * caused Gemini 3.1 Pro to loop on the customPrompt eval — after
 * finishing the document, the model re-read the trailing imperative
 * "Output the Markdown document directly..." as a fresh action prompt
 * and regenerated the entire response, producing duplicate component IDs.
 * Fixing required treating the format directive as behavioral (top) and
 * leaving only true negative constraints at the end. Vertex's own guide
 * warns: "Lower temperatures may cause unexpected behavior, looping, or
 * degraded performance."
 *
 * Failure-mode coverage at start: Scope Discipline and Select Option
 * Values — both validated as universal failure modes across 10+ OpenAI /
 * Anthropic variants. No fence-closing block yet; that quirk has only
 * bitten smaller-tier models so far. Add it if eval data shows fence
 * failures on Gemini Pro.
 *
 * Routing: substring match on `gemini-3.1-pro-preview` (24 chars). Picks
 * this variant for any model id containing that literal, including
 * `google/gemini-3.1-pro-preview` and any preview-suffixed alias.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { OUTPUT_FORMAT_BLOCK, SCOPE_DISCIPLINE_BLOCK, SELECT_OPTIONS_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GEMINI_3_1_PRO_PREVIEW = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
