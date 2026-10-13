/**
 * MDMA Author Prompt — Anthropic Claude Opus 5 variant.
 *
 * Same composition as `./opus-4.8.ts` plus <no_unrequested_extras>. Without it,
 * Opus 5 wrapped a single requested custom component (a map-picker) in an
 * unsolicited informational `callout` in ~1 of 8 runs, tripping the scope
 * check — the request named no component list, so <scope_discipline> alone
 * did not apply.
 *
 * Routing: substring match on `opus-5` (normalized `opus-5`).
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { SCOPE_DISCIPLINE_BLOCK } from './_shared.js';

const NO_UNREQUESTED_EXTRAS_BLOCK = `<no_unrequested_extras>
When the request asks for one thing (one input, one chart, one widget), emit that component plus the standard thinking block and nothing else. Do not add an informational callout, a tips or help box, a follow-up button, or a summary table around it. Surrounding prose may introduce the component, but it is not a reason to emit another component.
</no_unrequested_extras>`;

export const MDMA_AUTHOR_PROMPT_OPUS_5 = `${BASE_OPENING}

<output_format>
Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>

${SCOPE_DISCIPLINE_BLOCK}

${NO_UNREQUESTED_EXTRAS_BLOCK}

${BASE_BODY}

<self_check>
${BASE_CHECKLIST}
</self_check>
`;
