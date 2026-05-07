/**
 * MDMA Author Prompt — OpenAI GPT-5.4-mini variant.
 *
 * Adds <fence_closing> + <select_options> on top of the canonical opening:
 *
 *   - <fence_closing>   — when emitting a thinking block (or any component)
 *                          with a YAML \`content: |\` block scalar followed
 *                          by another component, gpt-5.4-mini sometimes
 *                          forgets to close the \`\`\`mdma fence with three
 *                          backticks before the next block, breaking
 *                          CommonMark parsing.
 *   - <select_options>  — for \`type: select\` fields, mini defaulted to
 *                          \`value: 1\` (number) when the user described
 *                          options as 1–5; the schema requires string values.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { CRITICAL_OUTPUT_LINE, FENCE_CLOSING_BLOCK, SELECT_OPTIONS_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_5_4_MINI = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${FENCE_CLOSING_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
