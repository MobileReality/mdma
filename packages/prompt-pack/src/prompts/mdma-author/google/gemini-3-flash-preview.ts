/**
 * MDMA Author Prompt — Google Gemini 3 Flash (Preview) variant.
 *
 * Mid-tier Gemini 3 (older Flash, between Pro and Flash-Lite). Treated as
 * a smaller-tier model defensively — same composition as
 * `gemini-3.1-flash-lite-preview.ts` with all three negative-constraint
 * blocks. Mid-tier models from other vendors have historically needed
 * fence-closing reminders (Anthropic Sonnet, OpenAI gpt-5.4-mini /
 * gpt-4.1-mini), so pre-emptive inclusion is cheap insurance until eval
 * data shows otherwise.
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
 * Same Gemini-3-guide rationale as the Pro variant — see
 * `gemini-3.1-pro-preview.ts`'s docblock. If eval data shows any of the
 * three negative-constraint blocks is unnecessary for Flash, strip it.
 *
 * Routing: substring match on `gemini-3-flash-preview` (22 chars). The
 * Pro variant filename (`gemini-3.1-pro-preview`) and the Flash-Lite
 * filename (`gemini-3.1-flash-lite-preview`) both contain `3.1`, so they
 * don't collide with this id (`gemini-3-flash-preview` has no `.1`).
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  FENCE_CLOSING_BLOCK,
  OUTPUT_FORMAT_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GEMINI_3_FLASH_PREVIEW = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${FENCE_CLOSING_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
