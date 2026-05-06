/**
 * MDMA Author Prompt — Google Gemini 3.1 Pro Preview Custom Tools variant.
 *
 * The OpenRouter model `google/gemini-3.1-pro-preview-customtools` is a
 * Pro tuning that improves tool/function-call selection in agentic
 * workflows (it prefers user-defined tools over a generic bash tool).
 * The text-generation behavior used by MDMA-author — produce Markdown +
 * ```mdma blocks, no tool calling — is unchanged from regular Pro, so
 * the same composition is used here. If a future eval shows the
 * customtools tuning behaves differently on pure text generation, edit
 * this file independently to diverge.
 *
 * Composition (Gemini-native ordering — same as `gemini-3.1-pro-preview.ts`):
 *
 *   BASE_OPENING (role)
 *     + ## Output Format          (behavioral directive — top, anchor)
 *     + BASE_BODY (the spec)
 *     + ## Scope Discipline       (negative constraint — end)
 *     + ## Select Option Values   (negative constraint — end)
 *     + BASE_CHECKLIST            (## Self-Check Checklist — end)
 *
 * Routing: substring match on `gemini-3.1-pro-preview-customtools`
 * (34 chars). Beats the Pro variant's 24-char match for any model id
 * containing this literal, including
 * `google/gemini-3.1-pro-preview-customtools`.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { OUTPUT_FORMAT_BLOCK, SCOPE_DISCIPLINE_BLOCK, SELECT_OPTIONS_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
