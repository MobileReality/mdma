/**
 * MDMA Author Prompt — Anthropic Haiku variant.
 *
 * Composed from `_shared.ts` (independent copy of the default prompt body)
 * with Anthropic-style framing inserted between the slots:
 *
 *   BASE_OPENING + <output_format> + BASE_BODY + <self_check>BASE_CHECKLIST</self_check>
 *
 * Same composition pattern as `packages/cli/src/prompts/anthropic/haiku.ts`.
 * Adding Sonnet/Opus variants reuses `_shared.ts` with their own framing
 * tweaks — drop a sibling file and the selector picks it up.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';

export const MDMA_AUTHOR_PROMPT_HAIKU = `${BASE_OPENING}

<output_format>
Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>

${BASE_BODY}

<self_check>
${BASE_CHECKLIST}
</self_check>
`;
