/**
 * MDMA Author Prompt — OpenAI GPT-5-nano variant.
 *
 * Smallest tier of gpt-5 — same framing as `gpt-5.4-nano.ts` and now also
 * `gpt-5-mini.ts`: all three blocks (<fence_closing> + <scope_discipline> +
 * <select_options>). Smaller-tier models in this family aggressively
 * over-elaborate workflows and need every available guard.
 *
 * Routing note: `gpt-5-nano` (10 chars) doesn't substring-match
 * `gpt-5.4-nano` (different separator: "-" vs "."), so this variant doesn't
 * shadow the existing 5.4-nano routing. Only matches the exact id `gpt-5-nano`.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  CRITICAL_OUTPUT_LINE,
  FENCE_CLOSING_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_5_NANO = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${FENCE_CLOSING_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
