/**
 * MDMA Author Prompt — Anthropic Claude Opus 5.5 variant.
 *
 * The same composition as `./opus-4.8.ts`, with the `thinking` component
 * described as a plan summary (see `describeThinkingAsPlanSummary`). With the
 * shared "AI reasoning" wording, Anthropic's API refused every author request
 * on this model with `stop_reason: refusal` (`reasoning_extraction`).
 *
 * Routing: substring match on `opus-5.5` (normalized `opus-5-5`).
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { SCOPE_DISCIPLINE_BLOCK, describeThinkingAsPlanSummary } from './_shared.js';

const BODY = describeThinkingAsPlanSummary(BASE_BODY, 'opus-5.5');

export const MDMA_AUTHOR_PROMPT_OPUS_5_5 = `${BASE_OPENING}

<output_format>
Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>

${SCOPE_DISCIPLINE_BLOCK}

${BODY}

<self_check>
${BASE_CHECKLIST}
</self_check>
`;
