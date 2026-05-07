/**
 * MDMA Author Prompt — OpenAI GPT-4.1 variant.
 *
 * Non-reasoning flagship from the gpt-4.x family. Adds <select_options>
 * after a flows eval reproduced the same numeric-value-on-select-option
 * failure mode seen on most gpt-5 variants — the schema requires string
 * `value` fields. <scope_discipline> and <fence_closing> are not yet
 * warranted; gpt-4.1 hasn't shown the workflow-elaboration or
 * fence-closing failures that bite the gpt-5 family.
 *
 * Now 7 of 10 OpenAI variants need <select_options>. Worth folding into
 * BASE_BODY rather than gating per-variant.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { CRITICAL_OUTPUT_LINE, SELECT_OPTIONS_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_4_1 = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${SELECT_OPTIONS_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
