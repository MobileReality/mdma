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

export const MDMA_AUTHOR_PROMPT_GEMINI_2_5_FLASH_LITE = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${FENCE_CLOSING_BLOCK}

${FENCE_IN_CONTENT_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
