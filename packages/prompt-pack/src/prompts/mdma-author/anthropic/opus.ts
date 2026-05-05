/**
 * MDMA Author Prompt — Anthropic Opus variant.
 *
 * Composed from `_shared.ts` with the same Anthropic-style framing as the
 * Haiku and Sonnet variants (`<output_format>` + `<self_check>` wrapping).
 * Currently byte-identical in structure — this file exists so the selector
 * routes `claude-opus-*` providers here independently, leaving room to
 * diverge once eval data shows an Opus-specific lever worth tuning.
 *
 * Same composition pattern as `packages/cli/src/prompts/anthropic/opus.ts`.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';

export const MDMA_AUTHOR_PROMPT_OPUS = `${BASE_OPENING}

<output_format>
Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>

${BASE_BODY}

<self_check>
${BASE_CHECKLIST}
</self_check>
`;
