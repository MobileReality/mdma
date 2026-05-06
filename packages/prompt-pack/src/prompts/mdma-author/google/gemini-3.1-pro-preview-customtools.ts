/**
 * MDMA Author Prompt — Google Gemini 3.1 Pro Preview Custom Tools variant.
 *
 * Re-export of `gemini-3.1-pro-preview.ts`. The OpenRouter model
 * `google/gemini-3.1-pro-preview-customtools` is a Pro tuning that
 * improves tool/function-call selection in agentic workflows (it prefers
 * user-defined tools over a generic bash tool). The text-generation
 * behavior used by MDMA-author — produce Markdown + ```mdma blocks, no
 * tool calling — is unchanged from regular Pro, so the same prompt
 * works and there is no reason to duplicate the body.
 *
 * If a future eval shows the customtools tuning behaves differently on
 * pure text generation, copy `gemini-3.1-pro-preview.ts`'s composition
 * inline here and diverge.
 *
 * Routing: substring match on `gemini-3.1-pro-preview-customtools`
 * (34 chars). Beats the Pro variant's 24-char match for any model id
 * containing this literal, including
 * `google/gemini-3.1-pro-preview-customtools`. Without this file the
 * customtools id would still resolve via the Pro substring match — this
 * file exists so the variant appears as a distinct entry in the
 * registry / demo picker / README matrix.
 */

export { MDMA_AUTHOR_PROMPT_GEMINI_3_1_PRO_PREVIEW as MDMA_AUTHOR_PROMPT_GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS } from './gemini-3.1-pro-preview.js';
