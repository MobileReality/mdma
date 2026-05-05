/**
 * System prompt for AI-assisted MDMA document authoring (canonical default).
 *
 * Composed from `_shared.ts` so the per-vendor variants under `<vendor>/`
 * stay byte-aligned to the same content surface. The default-specific
 * framing is the original "CRITICAL: ..." emphasis line between the
 * opening and the spec body.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from './_shared.js';

export const MDMA_AUTHOR_PROMPT = `${BASE_OPENING}

CRITICAL: Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. NEVER wrap your response in \`\`\`markdown code fences. Your response is already rendered as Markdown.

${BASE_BODY}

${BASE_CHECKLIST}
`;
