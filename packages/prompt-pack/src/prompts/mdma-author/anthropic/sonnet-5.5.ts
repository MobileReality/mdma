/**
 * MDMA Author Prompt — Anthropic Claude Sonnet 5.5 variant.
 *
 * Same composition as `./sonnet.ts`:
 *
 *   BASE_OPENING + <output_format> + <scope_discipline> + <fence_closing>
 *     + BASE_BODY + <self_check>BASE_CHECKLIST</self_check>
 *
 * with one difference: the `thinking` component is described as a short plan
 * summary instead of "AI reasoning". Sonnet 5.5's safety classifier answers
 * with `stop_reason: refusal` (category `reasoning_extraction`) when a system
 * prompt asks the model to write out its reasoning process; with the shared
 * wording 7 of 20 benign requests were refused on Anthropic's own API (and
 * surfaced as `finish_reason: content_filter` through OpenRouter). Reworded,
 * 0 of 20 were. The `thinking` block keeps its role and its fields — only the
 * description of what goes in `content` changes.
 *
 * Routing: substring match on `sonnet-5.5` (normalized `sonnet-5-5`). The
 * longest-match rule picks it over `sonnet-5.ts` and `sonnet.ts`.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  FENCE_CLOSING_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  describeThinkingAsPlanSummary,
} from './_shared.js';

const BODY = describeThinkingAsPlanSummary(BASE_BODY, 'sonnet-5.5');

export const MDMA_AUTHOR_PROMPT_SONNET_5_5 = `${BASE_OPENING}

<output_format>
Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>

${SCOPE_DISCIPLINE_BLOCK}

${FENCE_CLOSING_BLOCK}

${BODY}

<self_check>
${BASE_CHECKLIST}
</self_check>
`;
