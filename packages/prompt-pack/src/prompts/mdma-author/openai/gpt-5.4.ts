/**
 * MDMA Author Prompt — OpenAI GPT-5.4 variant.
 *
 * Adds <scope_discipline> on top of the canonical opening — gpt-5.4 has a
 * tendency to emit components beyond what the user listed when the workflow
 * "seems to call for them" (e.g., adding webhooks to a form/tasklist/button
 * spec because submission usually fires a webhook).
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { CRITICAL_OUTPUT_LINE, SCOPE_DISCIPLINE_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_5_4 = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${SCOPE_DISCIPLINE_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
