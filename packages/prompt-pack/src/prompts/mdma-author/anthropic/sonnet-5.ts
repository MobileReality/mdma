/**
 * MDMA Author Prompt — Anthropic Claude Sonnet 5 variant.
 *
 * Baseline: the same composition as `./sonnet.ts`, carried over unchanged
 * because no Anthropic Claude Sonnet 5-specific failure mode has been observed yet. Diverge THIS
 * file (add or drop framing blocks) only once an eval run shows a pattern
 * specific to this model; keep sibling variants independent.
 *
 * Routing: substring match on `sonnet-5` (normalized `sonnet-5`).
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { FENCE_CLOSING_BLOCK, SCOPE_DISCIPLINE_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_SONNET_5 = `${BASE_OPENING}

<output_format>
Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>

${SCOPE_DISCIPLINE_BLOCK}

${FENCE_CLOSING_BLOCK}

${BASE_BODY}

<self_check>
${BASE_CHECKLIST}
</self_check>
`;
