/**
 * MDMA Author Prompt — OpenAI GPT-5.4-nano variant.
 *
 * The smallest of the gpt-5.4 family — gets all three OpenAI-tier framing
 * blocks: <fence_closing> + <scope_discipline> + <select_options>. Each is
 * documented in `./_shared.ts` with the failure mode it addresses.
 *
 * If eval data shows nano can drop one of the three without regression,
 * remove the corresponding import. Keep tier-specific divergences narrow so
 * the diff between tiers stays readable.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  CRITICAL_OUTPUT_LINE,
  FENCE_CLOSING_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_5_4_NANO = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${FENCE_CLOSING_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
