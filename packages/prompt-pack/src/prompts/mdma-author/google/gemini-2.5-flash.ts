/**
 * MDMA Author Prompt — Google Gemini 2.5 Flash variant.
 *
 * Previous-generation mid-tier Flash. Same defensive composition as
 * `gemini-3-flash-preview.ts` — all three negative-constraint blocks
 * (fence closing + scope + select options). Mid-tier models from other
 * vendors have historically needed fence-closing reminders (Anthropic
 * Sonnet, OpenAI gpt-5.4-mini / gpt-4.1-mini), so pre-emptive inclusion
 * is cheap insurance until eval data shows otherwise.
 *
 * Composition (Gemini-native ordering):
 *
 *   BASE_OPENING (role)
 *     + ## Output Format          (behavioral directive — top, anchor)
 *     + BASE_BODY (the spec)
 *     + ## Fence Closing          (negative constraint — end)
 *     + ## Scope Discipline       (negative constraint — end)
 *     + ## Select Option Values   (negative constraint — end)
 *     + BASE_CHECKLIST            (## Self-Check Checklist — end)
 *
 * Same Gemini-native rationale as the Pro variant — see
 * `gemini-3.1-pro-preview.ts`'s docblock for the full background on
 * Markdown framing, end-placed constraints, and top-anchored format
 * directive.
 *
 * Routing: substring match on `gemini-2.5-flash` (16 chars). Beats the
 * Pro 2.5 variant's 14-char `gemini-2.5-pro` match for any model id
 * containing the literal `gemini-2.5-flash`. Catches both `2.5-flash`
 * and any `2.5-flash-*` suffix alias (e.g. `gemini-2.5-flash-lite`)
 * unless a more specific filename is added.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  FENCE_CLOSING_BLOCK,
  OUTPUT_FORMAT_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

// Scoped to gemini-2.5-flash only. Triggered by a flows-eval failure
// where the model emitted a malformed select option for the customer
// sentiment field — duplicating "Positive" mid-list with the second
// entry missing the \`value:\` field entirely:
//
//   options:
//     - label: Positive
//       value: positive
//     - label: positive       ← missing value, partial duplicate
//     - label: Neutral
//       value: neutral
//
// The shared SELECT_OPTIONS_BLOCK only addresses string-vs-number on
// value; this block adds the orthogonal rule that each entry must be
// complete (both label AND value) and options must not be duplicated.
const SELECT_ENTRY_COMPLETENESS_BLOCK = `## Select Option Entry Completeness

Every entry in a \`type: select\` field's \`options\` array has BOTH a \`label\` and a \`value\` — never a label alone. Each distinct choice appears once; do not duplicate or near-duplicate (e.g., \`Positive\` then \`positive\`).

Wrong (malformed and duplicated):

\`\`\`yaml
options:
  - label: Positive
    value: positive
  - label: positive          # missing value, duplicate of "Positive"
  - label: Neutral
    value: neutral
\`\`\`

Right:

\`\`\`yaml
options:
  - label: Positive
    value: positive
  - label: Neutral
    value: neutral
\`\`\``;

export const MDMA_AUTHOR_PROMPT_GEMINI_2_5_FLASH = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${FENCE_CLOSING_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${SELECT_ENTRY_COMPLETENESS_BLOCK}

${BASE_CHECKLIST}
`;
