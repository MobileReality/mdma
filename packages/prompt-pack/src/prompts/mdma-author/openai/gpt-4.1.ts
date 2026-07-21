/**
 * MDMA Author Prompt — OpenAI GPT-4.1 variant.
 *
 * Non-reasoning flagship from the gpt-4.x family. Composes:
 *
 *   - <fence_closing>   — gpt-4.1 emits raw YAML without \`\`\`mdma fences
 *                          (\`type: form at line 15 outside of a fenced
 *                          block\`). Same failure mode that triggered
 *                          adding this block to gpt-5.4 / gpt-5.4-mini.
 *   - <select_options>  — schema requires string \`value\` on select
 *                          options; gpt-4.1 produces numbers when the
 *                          user describes options as "1-5".
 *
 * Now 7 of 10 OpenAI variants need <select_options>. Worth folding into
 * BASE_BODY rather than gating per-variant.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  CRITICAL_OUTPUT_LINE,
  CUSTOM_USAGE_BLOCK,
  FENCE_CLOSING_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_4_1 = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${FENCE_CLOSING_BLOCK}

${SELECT_OPTIONS_BLOCK}

${CUSTOM_USAGE_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
