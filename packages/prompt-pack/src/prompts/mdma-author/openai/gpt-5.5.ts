/**
 * MDMA Author Prompt — OpenAI GPT-5.5 variant.
 *
 * Adds <scope_discipline> + <select_options> on top of the canonical opening:
 *
 *   - <scope_discipline>  — same gpt-5.4 failure mode: gpt-5.5 added an
 *                            unsolicited tasklist to a Sprint Retro spec
 *                            whose allowed list was chart, callout, form,
 *                            thinking only.
 *   - <select_options>    — same gpt-5.4-mini/nano failure mode: gpt-5.5
 *                            produced \`value: 1\` (number) for a 1–5 rating
 *                            scale; schema requires string values.
 *
 * <fence_closing> is not yet warranted — gpt-5.5 hasn't shown the missing-
 * closing-fence pattern that bites the smaller tiers.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  CRITICAL_OUTPUT_LINE,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_5_5 = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
