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
import { FENCE_CLOSING_BLOCK, SCOPE_DISCIPLINE_BLOCK } from './_shared.js';

const THINKING_AS_PLAN_SUMMARY: ReadonlyArray<readonly [string, string]> = [
  [
    'AI reasoning or thinking process. Useful for transparency about how the AI arrived at conclusions or recommendations.',
    'a short plan summary: what the document below contains and how it is structured.',
  ],
  ['free-form reasoning text', 'free-form plan summary text'],
  ['<reasoning text>', '<plan summary>'],
  ['to show your reasoning process', 'to summarize your plan for the document'],
  [
    'All reasoning belongs inside the `thinking` block',
    'All planning notes belong inside the `thinking` block',
  ],
  ['**Example — analysis reasoning:**', '**Example — plan summary:**'],
  [
    `First, I examined the quarterly revenue trends.
  Q3 shows a 15% dip which correlates with seasonal patterns.
  However, year-over-year growth remains strong at 23%.
  Recommendation: maintain current strategy with Q3 adjustments.`,
    `Plan: a table of quarterly revenue with a year-over-year summary.
  Columns: quarter, revenue, change vs. the previous year.`,
  ],
];

const BODY = THINKING_AS_PLAN_SUMMARY.reduce((body, [from, to]) => {
  if (!body.includes(from)) {
    throw new Error(`sonnet-5.5 prompt: shared body no longer contains "${from.slice(0, 60)}"`);
  }
  return body.split(from).join(to);
}, BASE_BODY);

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
