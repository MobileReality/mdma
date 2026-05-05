/**
 * MDMA Author Prompt — Anthropic Sonnet variant.
 *
 * Composed from `_shared.ts` with the same Anthropic-style framing as the
 * Haiku variant (`<output_format>` + `<self_check>` wrapping). Currently
 * byte-identical in structure — this file exists so the selector routes
 * `claude-sonnet-*` providers here independently, leaving room to diverge
 * once eval data shows a Sonnet-specific failure mode worth tuning for.
 *
 * Same composition pattern as `packages/cli/src/prompts/anthropic/sonnet.ts`.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';

export const MDMA_AUTHOR_PROMPT_SONNET = `${BASE_OPENING}

<output_format>
Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>

${BASE_BODY}

<self_check>
${BASE_CHECKLIST}
</self_check>
`;
