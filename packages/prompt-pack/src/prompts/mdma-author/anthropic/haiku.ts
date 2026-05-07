/**
 * MDMA Author Prompt — Anthropic Haiku variant.
 *
 * Composed from `../_shared.ts` (cross-variant base) and `./_shared.ts`
 * (Anthropic-tier framing) with the Anthropic-style framing slots:
 *
 *   BASE_OPENING + <output_format> + <scope_discipline> + BASE_BODY +
 *     <self_check>BASE_CHECKLIST</self_check>
 *
 * Same composition pattern as `packages/cli/src/prompts/anthropic/haiku.ts`.
 *
 * `<scope_discipline>` was added after a Haiku flows eval where it emitted
 * unsolicited `button` / `tasklist` components beyond the spec's allowed
 * list. The block lives in `./_shared.ts` (Anthropic-local) — same content
 * as `openai/_shared.ts` but duplicated to keep each vendor folder
 * self-contained.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { SCOPE_DISCIPLINE_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_HAIKU = `${BASE_OPENING}

<output_format>
Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>

${SCOPE_DISCIPLINE_BLOCK}

${BASE_BODY}

<self_check>
${BASE_CHECKLIST}
</self_check>
`;
