/**
 * MDMA Author Prompt — OpenAI GPT-5.5 variant.
 *
 * Composed from `../_shared.ts` with the original "CRITICAL:" emphasis-line
 * framing — same content as the canonical default. This file exists so the
 * selector routes `openai:gpt-5.5*` providers here independently, leaving
 * room to diverge once eval data shows a 5.5-specific lever worth tuning.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_5_5 = `${BASE_OPENING}

CRITICAL: Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. NEVER wrap your response in \`\`\`markdown code fences. Your response is already rendered as Markdown.

${BASE_BODY}

${BASE_CHECKLIST}
`;
