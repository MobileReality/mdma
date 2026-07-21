/**
 * MDMA Author Prompt — OpenAI GPT-5.1 variant.
 *
 * Older base-tier of the gpt-5 family. Same framing as `gpt-5.2.ts`:
 * <scope_discipline> + <select_options>. Both failure modes are family-wide
 * (5-of-6 variants need select_options, 4-of-6 need scope_discipline) so
 * this is the working default for any new gpt-5.x base-tier addition until
 * the consolidation into BASE_BODY happens.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  CRITICAL_OUTPUT_LINE,
  CUSTOM_USAGE_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_5_1 = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${CUSTOM_USAGE_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
