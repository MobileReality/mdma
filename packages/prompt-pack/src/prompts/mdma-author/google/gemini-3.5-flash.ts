/**
 * MDMA Author Prompt — Google Gemini 3.5 Flash variant.
 *
 * Flash tier of the Gemini 3.5 family. Treated defensively as a smaller-tier
 * model — same composition as `gemini-3-flash-preview.ts`, carrying all three
 * negative-constraint blocks (fence-closing, scope-discipline, select-values).
 * Mid/flash-tier models across vendors have historically needed these
 * reminders, so pre-emptive inclusion is cheap insurance until Flash-3.5 eval
 * data shows a block is unnecessary — strip it then.
 *
 * The cross-variant base body already documents the `custom` component
 * envelope and the string-select-value rule, and the Google
 * `SELECT_OPTIONS_BLOCK` reinforces the latter — so no Flash-3.5-specific
 * custom-component block is added yet. Add one here (Markdown-style, appended
 * after BASE_BODY per Google's negative-constraint-last guidance) if eval data
 * shows Flash-3.5 mishandling `custom` (e.g. embedding a variant as a form
 * field, the gpt-4.1-mini failure mode).
 *
 * Composition (Gemini-native ordering — directive up top, negative
 * constraints last per Google's Gemini 3 prompting guide):
 *
 *   BASE_OPENING (role)
 *     + ## Output Format          (behavioral directive — top, anchor)
 *     + BASE_BODY (the spec)
 *     + ## Fence Closing          (negative constraint — end)
 *     + ## Scope Discipline       (negative constraint — end)
 *     + ## Select Option Values   (negative constraint — end)
 *     + BASE_CHECKLIST            (## Self-Check Checklist — end)
 *
 * Routing: substring match on `gemini-3.5-flash` (normalized `gemini-3-5-flash`),
 * so it matches both a GA id (`google/gemini-3.5-flash`) and a preview suffix
 * (`google/gemini-3.5-flash-preview`). The `3.5` distinguishes it from the
 * `2.5`, `3`, and `3.1` flash filenames — no substring collision.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  FENCE_CLOSING_BLOCK,
  OUTPUT_FORMAT_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GEMINI_3_5_FLASH = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${FENCE_CLOSING_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
