/**
 * MDMA Author Prompt — Google Gemini 2.5 Pro variant.
 *
 * Previous-generation Pro (Gemini 3 is current). Same Gemini-native
 * composition as `gemini-3.1-pro-preview.ts` — Markdown framing,
 * end-placed negative constraints. The composition was derived from
 * Gemini 3 prompting guides; whether all rules apply identically to
 * 2.5 is unverified, but the layout is sensible for any Gemini Pro-tier
 * model and the evals validate empirically.
 *
 * Composition (Gemini-native ordering):
 *
 *   BASE_OPENING (role)
 *     + ## Output Format          (behavioral directive — top, anchor)
 *     + BASE_BODY (the spec)
 *     + ## Scope Discipline       (negative constraint — end)
 *     + ## Select Option Values   (negative constraint — end)
 *     + BASE_CHECKLIST            (## Self-Check Checklist — end)
 *
 * No `## Fence Closing` — Pro-tier hasn't shown that quirk. Add it if
 * eval data shows fence-closing failures on Gemini 2.5.
 *
 * Routing: substring match on `gemini-2.5-pro` (14 chars). The Gemini
 * 3.x variant filenames all contain `3.1` or `3-flash` and don't match
 * a `2.5-pro` model id, so there is no collision.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { OUTPUT_FORMAT_BLOCK, SCOPE_DISCIPLINE_BLOCK, SELECT_OPTIONS_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GEMINI_2_5_PRO = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
