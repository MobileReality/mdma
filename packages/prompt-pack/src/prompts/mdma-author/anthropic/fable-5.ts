/**
 * MDMA Author Prompt — Anthropic Fable 5 variant.
 *
 * Fable 5 (`claude-fable-5`) is an Anthropic-family model, routed via
 * `openrouter:anthropic/claude-fable-5` (family `anthropic`, so this file lives
 * beside the Opus/Sonnet/Haiku variants).
 *
 * Composition mirrors the Opus flagship variants —
 *   BASE_OPENING + <output_format> + <scope_discipline> + BASE_BODY +
 *     <self_check>BASE_CHECKLIST</self_check>
 * — because no Fable-specific failure modes have been observed in evals yet, so
 * it starts from the same well-tuned baseline. Add targeted `./_shared.ts`
 * blocks here if Fable eval data later shows model-specific patterns.
 *
 * Routing note: matches model ids containing `fable-5` (the selector normalizes
 * `.`↔`-`). If your provider exposes Fable under a non-`anthropic` family
 * segment, move this file into that family folder.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { SCOPE_DISCIPLINE_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_FABLE_5 = `${BASE_OPENING}

<output_format>
Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>

${SCOPE_DISCIPLINE_BLOCK}

${BASE_BODY}

<self_check>
${BASE_CHECKLIST}
</self_check>
`;
