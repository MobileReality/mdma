/**
 * MDMA Author Prompt — OpenAI GPT-5-mini variant.
 *
 * Mini tier of gpt-5 — needs all three framing blocks
 * (<fence_closing> + <scope_discipline> + <select_options>), same mix as
 * `gpt-5.4-nano.ts`. Initially shipped with just <fence_closing> +
 * <select_options> matching gpt-5.4-mini, but the base eval revealed 6
 * "Unexpected component: webhook" failures — gpt-5-mini aggressively adds
 * webhooks to scoped outputs that don't list them, so <scope_discipline>
 * is required. The "mini" naming doesn't perfectly map across minor versions:
 * gpt-5-mini behaves closer to gpt-5.4-nano than to gpt-5.4-mini.
 *
 * Routing note: `gpt-5-mini` (10 chars) doesn't substring-match `gpt-5.4-mini`
 * (different separator: "-" vs "."), so adding this variant doesn't shadow
 * the existing 5.4-mini routing. Only matches the exact id `gpt-5-mini`.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  CRITICAL_OUTPUT_LINE,
  FENCE_CLOSING_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_5_MINI = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${FENCE_CLOSING_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
