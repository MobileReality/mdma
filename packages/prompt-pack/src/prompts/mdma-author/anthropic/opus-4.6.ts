/**
 * MDMA Author Prompt — Anthropic Claude Opus 4.6 variant.
 *
 * Same framing as `./opus.ts` (the catch-all Opus variant): adds
 * <scope_discipline> on top of the standard Anthropic <output_format>
 * + <self_check> wrapping. Currently structurally identical to opus.ts —
 * this file exists so the selector can route `claude-opus-4.6` model ids
 * here independently, leaving room for a 4.6-specific tuning when eval
 * data justifies divergence.
 *
 * Routing note: the longest-substring matcher in `evals/select-prompt.mjs`
 * picks `opus-4.6.ts` (8 chars) over `opus.ts` (4 chars) for any model id
 * containing the literal `opus-4.6`. Dash-form ids (`claude-opus-4-6`)
 * fall back to `opus.ts` — if you need dash-form routing, add a sibling
 * `opus-4-6.ts` or rename this file.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { SCOPE_DISCIPLINE_BLOCK, SELECT_OPTIONS_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_OPUS_4_6 = `${BASE_OPENING}

<output_format>
Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_BODY}

<self_check>
${BASE_CHECKLIST}
</self_check>
`;
