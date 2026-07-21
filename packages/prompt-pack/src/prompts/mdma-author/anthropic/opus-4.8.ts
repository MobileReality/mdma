/**
 * MDMA Author Prompt — Anthropic Claude Opus 4.8 variant.
 *
 * Composed from `../_shared.ts` (cross-variant base) and `./_shared.ts`
 * (Anthropic-tier framing) with the slots:
 *
 *   BASE_OPENING + <output_format> + <scope_discipline> + BASE_BODY +
 *     <self_check>BASE_CHECKLIST</self_check>
 *
 * Same composition as `./opus-4.7.ts` — Opus's eager submission-UX habit
 * (unsolicited buttons on scoped specs) makes `<scope_discipline>` worth
 * carrying forward. Created after a custom-component eval run where 4.8 fell
 * back to the `default` prompt (no opus-4.8 variant existed); 4.8 passed the
 * suite on the base prompt alone, so no 4.8-specific blocks are warranted yet
 * — add targeted blocks here if later eval data shows 4.8-specific patterns.
 *
 * Routing note: matches model ids containing `opus-4.8` / `opus-4-8` (the
 * selector normalizes `.`↔`-`). Longest-substring match picks it over
 * `opus-4.6.ts` / `opus-4.7.ts` for `claude-opus-4-8`.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { SCOPE_DISCIPLINE_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_OPUS_4_8 = `${BASE_OPENING}

<output_format>
Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>

${SCOPE_DISCIPLINE_BLOCK}

${BASE_BODY}

<self_check>
${BASE_CHECKLIST}
</self_check>
`;
