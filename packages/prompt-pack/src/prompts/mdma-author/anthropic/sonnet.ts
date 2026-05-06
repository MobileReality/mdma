/**
 * MDMA Author Prompt — Anthropic Sonnet variant.
 *
 * Composed from `../_shared.ts` (cross-variant base) and `./_shared.ts`
 * (Anthropic-tier framing) with the slots:
 *
 *   BASE_OPENING + <output_format> + <scope_discipline> + <fence_closing>
 *     + BASE_BODY + <self_check>BASE_CHECKLIST</self_check>
 *
 * Same composition pattern as `packages/cli/src/prompts/anthropic/sonnet.ts`
 * and parallel to `./haiku.ts`.
 *
 * Framing blocks added in response to specific failure modes:
 *   - <scope_discipline> — base eval where Sonnet emitted unsolicited
 *     `button` and `callout` components beyond the spec's allowed list.
 *   - <fence_closing>    — flows eval where the final mdma block opened
 *     with ```mdma but the output ended without the closing ```.
 *
 * Both blocks sourced from `./_shared.ts` (Anthropic-local).
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { FENCE_CLOSING_BLOCK, SCOPE_DISCIPLINE_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_SONNET = `${BASE_OPENING}

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
