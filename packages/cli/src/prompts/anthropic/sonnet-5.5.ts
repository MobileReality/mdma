/**
 * Master Prompt — Anthropic Claude Sonnet 5.5 variant.
 *
 * Same composition as `./sonnet.ts`:
 *   BASE_HEADER + 4 EXAMPLE_* blocks + BASE_FOOTER
 *
 * with one difference: the `thinking` component is described as a short plan
 * summary instead of an analysis of the case. Sonnet 5.5's safety classifier
 * answers with `stop_reason: refusal` (category `reasoning_extraction`) when a
 * system prompt asks the model to write out its reasoning; the shared examples
 * say "a thinking block analyzing the case", which is that request. The
 * component keeps its role and fields — only what goes in `content` changes,
 * both in the examples the model reads and in the custom prompts it writes.
 * The author prompt `mdma-author/anthropic/sonnet-5.5.ts` makes the same swap.
 *
 * Routing: substring match on `sonnet-5.5` (normalized `sonnet-5-5`), so the
 * longest-match rule picks it for `claude-sonnet-5-5` over `sonnet.ts`, which
 * keeps serving `claude-sonnet-5` and the 4.x models unchanged.
 */

import {
  BASE_FOOTER,
  BASE_HEADER,
  EXAMPLE_CONSULTATION_BOOKING,
  EXAMPLE_KYC,
  EXAMPLE_ORDER_FULFILLMENT,
  EXAMPLE_SUPPORT_INTAKE,
} from './_shared.js';

const THINKING_AS_PLAN_SUMMARY: ReadonlyArray<readonly [string, string]> = [
  [
    'a thinking block analyzing the issue and a form to collect ticket details',
    'a thinking block summarizing the plan and a form to collect ticket details',
  ],
  [
    '**Thinking** — Briefly note the issue category and any urgency signals before presenting the form.',
    '**Thinking** — A short plan summary: the intake form below collects the ticket details for triage.',
  ],
  [
    'content: Customer reported an issue. Gathering ticket details for the support team to triage.',
    'content: Plan - a support intake form collecting name, contact email, issue category and a description.',
  ],
  [
    'a thinking block analyzing the case, a PEP warning callout',
    'a thinking block summarizing the plan, a PEP warning callout',
  ],
  [
    'content: Applicant verification request received. Standard checks: ID document, address proof, sanctions screening.',
    'content: Plan - an applicant verification form collecting identity details, preceded by a PEP warning when applicable.',
  ],
  [
    'a thinking block analyzing the order context and the order form',
    'a thinking block summarizing the plan and the order form',
  ],
  ['id: support-analysis', 'id: support-plan'],
  ['id: kyc-case-analysis', 'id: kyc-plan'],
];

const SHARED_EXAMPLES = [
  EXAMPLE_CONSULTATION_BOOKING,
  EXAMPLE_SUPPORT_INTAKE,
  EXAMPLE_ORDER_FULFILLMENT,
  EXAMPLE_KYC,
].join('\n\n');

const EXAMPLES = THINKING_AS_PLAN_SUMMARY.reduce((examples, [from, to]) => {
  if (!examples.includes(from)) {
    throw new Error(`sonnet-5.5 master prompt: examples no longer contain "${from.slice(0, 60)}"`);
  }
  return examples.split(from).join(to);
}, SHARED_EXAMPLES);

const PLAN_SUMMARY_THINKING_BLOCK = `## Describing the Thinking Component

When "thinking" is a selected component, describe it in the custom prompt as a short plan summary of the document that follows: one or two sentences on what the document contains and how it is structured.`;

export const MASTER_PROMPT_SONNET_5_5 = `${BASE_HEADER}

<examples>
${EXAMPLES}
</examples>

${PLAN_SUMMARY_THINKING_BLOCK}

${BASE_FOOTER}
`;
