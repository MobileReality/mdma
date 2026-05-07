/**
 * MDMA Author Prompt — OpenAI GPT-5.2 variant.
 *
 * Older base-tier of the gpt-5 family. Adds <scope_discipline> +
 * <select_options>:
 *
 *   - <scope_discipline>  — same gpt-5.4 failure: emitting components
 *                            beyond what the user listed
 *   - <select_options>    — same gpt-5.5/mini/nano failure: \`value: 1\`
 *                            for select options when user said "1-5"
 *
 * Now 4 of 6 GPT variants need <select_options> — strong signal it
 * should be folded into BASE_BODY rather than gated per-variant.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { CRITICAL_OUTPUT_LINE, SCOPE_DISCIPLINE_BLOCK, SELECT_OPTIONS_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_5_2 = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
