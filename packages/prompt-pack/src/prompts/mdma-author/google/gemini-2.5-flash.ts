/**
 * MDMA Author Prompt — Google Gemini 2.5 Flash variant.
 *
 * Previous-generation mid-tier Flash. Same defensive composition as
 * `gemini-3-flash-preview.ts` — all three negative-constraint blocks
 * (fence closing + scope + select options). Mid-tier models from other
 * vendors have historically needed fence-closing reminders (Anthropic
 * Sonnet, OpenAI gpt-5.4-mini / gpt-4.1-mini), so pre-emptive inclusion
 * is cheap insurance until eval data shows otherwise.
 *
 * Composition (Gemini-native ordering):
 *
 *   BASE_OPENING (role)
 *     + ## Output Format          (behavioral directive — top, anchor)
 *     + BASE_BODY (the spec)
 *     + ## Fence Closing          (negative constraint — end)
 *     + ## Scope Discipline       (negative constraint — end)
 *     + ## Select Option Values   (negative constraint — end)
 *     + BASE_CHECKLIST            (## Self-Check Checklist — end)
 *
 * Same Gemini-native rationale as the Pro variant — see
 * `gemini-3.1-pro-preview.ts`'s docblock for the full background on
 * Markdown framing, end-placed constraints, and top-anchored format
 * directive.
 *
 * Routing: substring match on `gemini-2.5-flash` (16 chars). Beats the
 * Pro 2.5 variant's 14-char `gemini-2.5-pro` match for any model id
 * containing the literal `gemini-2.5-flash`. Catches both `2.5-flash`
 * and any `2.5-flash-*` suffix alias (e.g. `gemini-2.5-flash-lite`)
 * unless a more specific filename is added.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  FENCE_CLOSING_BLOCK,
  OUTPUT_FORMAT_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GEMINI_2_5_FLASH = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${FENCE_CLOSING_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
