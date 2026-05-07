/**
 * MDMA Author Prompt — Google Gemini 3.1 Flash-Lite (Preview) variant.
 *
 * Smaller-tier sibling of `gemini-3.1-pro-preview.ts`. Flash-Lite is the
 * smallest/fastest Gemini 3.1 tier, so this variant pre-emptively bundles
 * all three universal failure-mode blocks — same defensive posture as
 * `openai/gpt-4.1-nano.ts`, `openai/gpt-5-nano.ts`, and
 * `anthropic/haiku.ts` for their respective vendors.
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
 * Same Gemini-3-guide rationale as the Pro variant — see that file's
 * docblock. Differences from Pro:
 *
 * - Adds `FENCE_CLOSING_BLOCK`. Smaller-tier models forget the closing
 *   ``` fence under load (observed on gpt-5.4-mini, gpt-4.1-nano,
 *   Sonnet). Cheap insurance for Flash-Lite.
 *
 * Routing: substring match on `gemini-3.1-flash-lite-preview` (29 chars).
 * Beats the Pro variant's 24-char match for any model id containing this
 * literal, including `google/gemini-3.1-flash-lite-preview`. The Pro
 * variant filename (`gemini-3.1-pro-preview`) doesn't appear as a
 * substring of the flash-lite model id, so there's no ambiguity in the
 * other direction either.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  FENCE_CLOSING_BLOCK,
  OUTPUT_FORMAT_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GEMINI_3_1_FLASH_LITE_PREVIEW = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${FENCE_CLOSING_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
