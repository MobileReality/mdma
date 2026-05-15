/**
 * MDMA Author Prompt — Google Gemini 2.5 Flash-Lite variant.
 *
 * Previous-generation smallest-tier Flash-Lite. Same defensive composition
 * as the other Flash variants plus one extra block, `## No Fence
 * Characters in Content Fields`, defined inline below because it is used
 * only by this variant. (Shared blocks live in `./_shared.js`; single-use
 * blocks live with the variant that needs them, to keep the shared file
 * focused on content reused by 2+ variants.)
 *
 * Composition (Gemini-native ordering):
 *
 *   BASE_OPENING (role)
 *     + ## Output Format                       (behavioral, top — anchor)
 *     + BASE_BODY (the spec)
 *     + ## Fence Closing                       (negative constraint, end)
 *     + ## No Fence Characters in Content      (negative constraint, end)
 *     + ## Scope Discipline                    (negative constraint, end)
 *     + ## Select Option Values                (negative constraint, end)
 *     + BASE_CHECKLIST                         (## Self-Check Checklist, end)
 *
 * Why the extra inline block: Flash-Lite "thinks out loud" inside its
 * `thinking` block's `content: |` scalar, and was echoing prompt rules
 * using the literal ```mdma syntax (e.g. "I need to ensure each form is
 * enclosed in its own ```mdma block."). The Markdown parser walking the
 * doc counted those embedded fences as real openings, breaking the
 * open/close pair count and tripping [yaml-correctness] validation on
 * later components. The other Flash variants don't echo prompt syntax
 * verbatim, so the extra rule would be wasted tokens for them.
 *
 * If eval data later shows the same failure mode on another Gemini
 * variant, copy the inline block (or extract it to `./_shared.js` if it
 * ends up needed by 2+ variants).
 *
 * Same Gemini-native rationale (Markdown framing, end-placed constraints,
 * top-anchored format directive) as the Pro variant — see
 * `gemini-3.1-pro-preview.ts`'s docblock for the full background.
 *
 * Routing: substring match on `gemini-2.5-flash-lite` (21 chars). Beats
 * the `gemini-2.5-flash.ts` 16-char match for any model id containing
 * the literal `gemini-2.5-flash-lite`.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  FENCE_CLOSING_BLOCK,
  OUTPUT_FORMAT_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

const FENCE_IN_CONTENT_BLOCK = `## No Fence Characters in Content Fields

**Never write the literal characters \`\`\`mdma or \`\`\` (triple backticks) inside any block's \`content:\` field.** The Markdown parser walks the document looking for fence pairs; phantom fences inside a YAML block scalar break the open/close count and the document fails validation. When reasoning inside a \`thinking\` block about MDMA structure, refer to blocks in plain prose ("the form below", "the next component", "this block") — never quote fence syntax verbatim.`;

// Scoped to gemini-2.5-flash-lite only. Triggered by a conversation-eval
// failure on Conv 11/T2: after generating an event registration form in
// T1, the user's T2 message was "What if someone has a nut allergy?
// That's not listed in the dietary options." The model interpreted this
// as a request to UPDATE the form and re-emitted the entire form with
// "nut-allergy" added to the dietary-preference options, instead of
// responding in plain prose. The custom prompt's "respond conversationally
// without regenerating" instruction is being overridden by Flash-Lite's
// strong "be helpful, fix the gap" instinct.
const NO_REGENERATION_BLOCK = `## Follow-Up Conversations

When the user asks a question about a component that you already emitted in an earlier turn of the conversation, respond in conversational prose only. Do NOT re-emit, update, append fields to, or otherwise regenerate any \`\`\`mdma block from a previous turn — even when the user points out a missing option, suggests an improvement, or asks a clarifying question.

The component you emitted earlier is still visible to the user. Modifying it requires its own dedicated turn where the user explicitly asks for the change ("please add a nut-allergy option" — explicit request, regenerate); a passive question ("what if someone has a nut allergy?" — answer in prose) does not.`;

export const MDMA_AUTHOR_PROMPT_GEMINI_2_5_FLASH_LITE = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${FENCE_CLOSING_BLOCK}

${FENCE_IN_CONTENT_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${NO_REGENERATION_BLOCK}

${BASE_CHECKLIST}
`;
