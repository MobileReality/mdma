/**
 * MDMA Author Prompt — Google Gemma variant (whole family).
 *
 * Covers Google's open-weights Gemma models served via OpenRouter — Gemma 4
 * (26B-a4b / 31B) and the smaller Gemma 3n (4B). They share Gemini's
 * Markdown-over-XML prompting conventions, so this variant reuses the Gemini
 * `google/_shared.ts` blocks and the same Gemini-native ordering (behavioral
 * directive at the top, negative constraints at the end — per Google's Vertex
 * prompting guide).
 *
 * Defensive posture mirrors the smallest Gemini tier
 * (`gemini-3.1-flash-lite-preview.ts`) and the other vendors' small-model
 * variants (`openai/gpt-4.1-nano.ts`, `anthropic/haiku.ts`): a small open
 * model is the most likely to drop a closing fence, emit unsolicited
 * components, or use numeric select values, so all three universal
 * failure-mode blocks are bundled pre-emptively.
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
 * Routing: substring match on `gemma` matches every Gemma model id
 * (`google/gemma-4-26b-a4b-it`, `google/gemma-4-31b-it`, `google/gemma-3n-e4b-it`,
 * and their `:free` tiers), so this single variant covers the whole family.
 * `gemma` is not a substring of any Gemini model id (`gemini-*`), so there's
 * no cross-match with the Gemini variants in this folder.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  FENCE_CLOSING_BLOCK,
  OUTPUT_FORMAT_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GEMMA = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${FENCE_CLOSING_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
