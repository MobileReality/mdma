/**
 * MDMA Author Prompt — OpenAI GPT-6.1 Sol variant.
 *
 * Baseline: the same composition as `./gpt-5.6-sol.ts`, carried over unchanged
 * because no OpenAI GPT-6.1 Sol-specific failure mode has been observed yet. Diverge THIS
 * file (add or drop framing blocks) only once an eval run shows a pattern
 * specific to this model; keep sibling variants independent.
 *
 * Routing: substring match on `gpt-6.1-sol` (normalized `gpt-6-1-sol`).
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  CRITICAL_OUTPUT_LINE,
  CUSTOM_USAGE_BLOCK,
  INTERACTIVE_TYPES_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
  SINGLE_INTERACTIVE_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_6_1_SOL = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${SCOPE_DISCIPLINE_BLOCK}

${INTERACTIVE_TYPES_BLOCK}

${SINGLE_INTERACTIVE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${CUSTOM_USAGE_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
