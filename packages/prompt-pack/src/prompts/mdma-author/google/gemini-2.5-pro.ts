/**
 * MDMA Author Prompt — Google Gemini 2.5 Pro variant.
 *
 * Previous-generation Pro (Gemini 3 is current). Same Gemini-native
 * composition as `gemini-3.1-pro-preview.ts` — Markdown framing,
 * end-placed negative constraints.
 *
 * Composition (Gemini-native ordering):
 *
 *   BASE_OPENING (role)
 *     + ## Output Format          (behavioral directive — top, anchor)
 *     + BASE_BODY (the spec)
 *     + ## Fence Closing          (structural rule — mid)
 *     + ## Thinking Block         (uniqueness + no-preamble — mid)
 *     + ## Scope Discipline       (negative constraint — end)
 *     + ## Select Option Values   (negative constraint — end)
 *     + BASE_CHECKLIST            (## Self-Check Checklist — end)
 *
 * FENCE_CLOSING_BLOCK + inline THINKING_DISCIPLINE_BLOCK added after
 * observing 2 main-eval failures — the model emitted preamble Markdown
 * prose ("**Generating MDMA Document**\\n\\nI'm currently focused on…")
 * before opening the \`\`\`mdma fence, and generated date-prefixed
 * thinking ids (\`20240521-approval-gate-creation\`) that fail
 * kebab-case validation. Same family of failures the
 * gemini-3.1-pro-preview variant documents.
 *
 * Routing: substring match on `gemini-2.5-pro` (14 chars). The Gemini
 * 3.x variant filenames all contain `3.1` or `3-flash` and don't match
 * a `2.5-pro` model id, so there is no collision.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  FENCE_CLOSING_BLOCK,
  OUTPUT_FORMAT_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

// Scope and uniqueness rule for the thinking block, scoped to
// gemini-2.5-pro only (kept inline rather than promoted to _shared so
// other Gemini variants' evals are not perturbed). Triggered by the
// same failure mode the gemini-3.1-pro-preview variant documents:
// the model writes a Markdown preamble loop ("Thinking: **Generating
// MDMA Document**\n\nI'm currently focused on…\n\n**Constructing
// MDMA Document**\n\nI'm integrating…") BEFORE opening a \`\`\`mdma
// fence. Also generates date-prefixed thinking ids
// (\`20240521-approval-gate-creation\`) that fail kebab-case validation.
//
// Placed mid-prompt (after FENCE_CLOSING_BLOCK, before SCOPE_DISCIPLINE)
// — the 3.1 Pro variant comment documents a regression where an
// imperative directive at the LITERAL final position caused Gemini to
// re-read it as a fresh action prompt and loop. Mid-position avoids
// that trigger.
const THINKING_DISCIPLINE_BLOCK = `## Thinking Block

The first three characters of your response are \`\`\`\` \`\`\` \`\`\`\` (three backticks) followed by \`mdma\`, opening a thinking block. Nothing precedes it — no greeting, no Markdown heading, no prose starting with "Thinking:" or "**Building X**" or "I'm currently…". All planning (what to build, which fields to include, why certain values are chosen) belongs inside that single thinking block.

After the thinking block's closing \`\`\`\` \`\`\` \`\`\`\`, generate the requested components in sequence. Each component — including the thinking block itself — appears exactly once. Every \`id\` is unique within your response and uses lowercase-kebab-case (no date prefixes, no underscores, no uppercase). The response ends immediately after the closing \`\`\`\` \`\`\` \`\`\`\` of the last component; do not re-emit, re-explain, or restart any part of your output.`;

export const MDMA_AUTHOR_PROMPT_GEMINI_2_5_PRO = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${FENCE_CLOSING_BLOCK}

${THINKING_DISCIPLINE_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
