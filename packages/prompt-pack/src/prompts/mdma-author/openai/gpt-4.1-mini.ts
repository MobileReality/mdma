/**
 * MDMA Author Prompt — OpenAI GPT-4.1-mini variant.
 *
 * Mini tier of the gpt-4.1 family — non-reasoning. Same starting framing
 * as `gpt-5.4-mini.ts`: <fence_closing> + <select_options>. Mini-tier
 * models tend to share the missing-closing-fence-after-YAML-block-scalar
 * pattern; <select_options> is virtually family-wide at this point.
 *
 * If eval data shows gpt-4.1-mini also adds unsolicited components on
 * scoped specs (the gpt-5-mini failure mode), import <scope_discipline>
 * from `./_shared.js`.
 *
 * <custom_usage> is end-placed (sandwich): signing-request and rating-request
 * evals showed this model both embedding a `custom` variant as a form field
 * and inventing an unlisted variant. Being literal, it needs both directions
 * stated explicitly with exact patterns, reinforced at the end of the prompt.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  CRITICAL_OUTPUT_LINE,
  FENCE_CLOSING_BLOCK,
  SELECT_OPTIONS_BLOCK,
  CUSTOM_USAGE_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_4_1_MINI = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${FENCE_CLOSING_BLOCK}

${SELECT_OPTIONS_BLOCK}

${CUSTOM_USAGE_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}

${CUSTOM_USAGE_BLOCK}
`;
