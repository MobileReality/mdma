/**
 * MDMA Author Prompt — OpenAI GPT-5 variant.
 *
 * Adds <scope_discipline> + <select_options> on top of the canonical opening.
 * Same framing mix as `gpt-5.5.ts` — both are flagship-tier members of the
 * gpt-5 family and exhibit the same two failure modes:
 *
 *   - <scope_discipline>  — emitting components beyond what the user listed
 *   - <select_options>    — \`value: 1\` (number) for select options when
 *                            the schema requires string values
 *
 * <fence_closing> isn't included — flagship tiers haven't shown the missing-
 * closing-fence pattern that bites mini/nano.
 *
 * Routing note: `gpt-5` is a substring of every other gpt-5.x filename, but
 * the longest-match rule in `evals/select-prompt.mjs` ensures `gpt-5.5`,
 * `gpt-5.4`, etc. still pick their dedicated variants. This file only
 * matches the exact model id `gpt-5`.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  CRITICAL_OUTPUT_LINE,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_5 = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
