/**
 * MDMA Author Prompt — Anthropic Claude Opus 4.7 variant.
 *
 * Composed from `../_shared.ts` (cross-variant base) and `./_shared.ts`
 * (Anthropic-tier framing) with the slots:
 *
 *   BASE_OPENING + <output_format> + <scope_discipline> + BASE_BODY +
 *     <self_check>BASE_CHECKLIST</self_check>
 *
 * Same composition pattern as `packages/cli/src/prompts/anthropic/opus.ts`
 * and parallel to `./haiku.ts` / `./sonnet.ts` / `./opus-4.6.ts`.
 *
 * `<scope_discipline>` was added after a flows eval where Opus emitted an
 * unsolicited `button` component on every test that allowed only form +
 * callout + thinking. Opus appears especially eager to add submission UX
 * (buttons) to scoped specs. <fence_closing> is not yet warranted —
 * Opus hasn't shown the missing-closing-fence pattern.
 *
 * Routing note: this file matches model ids containing literal `opus-4.7`.
 * The selector's longest-substring match picks it over `opus-4.6.ts` for
 * `claude-opus-4.7`. Floating aliases like `claude-opus-latest` do NOT
 * route here — pin an explicit version in EVAL_PROVIDER, or add a catch-all
 * `opus.ts` if you need alias support.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { SCOPE_DISCIPLINE_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_OPUS_4_7 = `${BASE_OPENING}

<output_format>
Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>

${SCOPE_DISCIPLINE_BLOCK}

${BASE_BODY}

<self_check>
${BASE_CHECKLIST}
</self_check>
`;
