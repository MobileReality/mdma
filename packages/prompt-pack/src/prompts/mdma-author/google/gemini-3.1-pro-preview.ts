/**
 * MDMA Author Prompt — Google Gemini 3.1 Pro (Preview) variant.
 *
 * Composition (Gemini-native ordering):
 *
 *   BASE_OPENING (role)
 *     + ## Output Format          (behavioral directive, top — anchor)
 *     + BASE_BODY (the spec)
 *     + ## Fence Closing          (structural rule — mid)
 *     + ## Thinking Block         (uniqueness + no-duplicate — mid)
 *     + ## Scope Discipline       (negative constraint — end)
 *     + ## Select Option Values   (negative constraint — end)
 *     + BASE_CHECKLIST            (## Self-Check Checklist — end)
 *
 * Why this ordering — Google's Gemini 3 prompting guides distinguish two
 * placement rules:
 *
 * 1. Phil Schmid's Google guide
 *    (https://www.philschmid.de/gemini-3-prompt-practices): "Place
 *    behavioral constraints and role definitions in the System Instruction
 *    or at the very top of the prompt to ensure they anchor the model's
 *    reasoning process." → role + output-format directive at top.
 *
 * 2. Vertex official guide
 *    (https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide):
 *    "negative constraints should be placed at the end of the instruction."
 *    → scope-discipline + select-option-values rules at the end.
 *
 * 3. "Use either XML-style tagging OR Markdown consistently — mixing them
 *    confuses the model." → framing blocks are Markdown headings, not
 *    XML tags. (OpenAI/Anthropic variants stick with their
 *    vendor-recommended XML scaffolding.)
 *
 * Earlier revision regression: an experimental version put the
 * output-format directive as the LITERAL final line of the prompt. That
 * caused Gemini 3.1 Pro to loop on the customPrompt eval — after
 * finishing the document, the model re-read the trailing imperative
 * "Output the Markdown document directly..." as a fresh action prompt
 * and regenerated the entire response, producing duplicate component IDs.
 * Fixing required treating the format directive as behavioral (top) and
 * leaving only true negative constraints at the end. Vertex's own guide
 * warns: "Lower temperatures may cause unexpected behavior, looping, or
 * degraded performance."
 *
 * Failure-mode coverage: Fence Closing, Thinking Block discipline,
 * Scope Discipline, and Select Option Values — all validated as failure
 * modes for Gemini 3.1 Pro specifically. FENCE_CLOSING_BLOCK and
 * THINKING_DISCIPLINE_BLOCK go mid-prompt (after BASE_BODY) so the spec
 * defines what an mdma block is before the rules tighten emission;
 * THINKING_DISCIPLINE addresses gpt-5.4-style duplicate-emission that
 * surfaced on Gemini Pro (correct response then verbatim re-emission
 * with duplicate ids). SCOPE_DISCIPLINE and SELECT_OPTIONS stay at the
 * end per Vertex guidance on negative constraints.
 *
 * Stochastic loop floor: even after the above, gemini-3.1-pro-preview
 * still loops on ~7–15% of flow runs — the model emits Markdown prose
 * preamble ("**Investigating Production Errors**" × 3-5) instead of
 * opening a \`\`\`mdma block. Per Google's prompt guide, this is
 * temperature-driven model behavior — no prompt-level fix reduced the
 * count below this floor (tested: literal first-byte example, positive
 * scope reframe, no-loop block, no-duplicates tail — all shifted which
 * test loops, none reduced the count). Documented as 🟡 ‡ in the
 * Prompt Matrix similar to gpt-5.4's documented duplication bug.
 *
 * Routing: substring match on `gemini-3.1-pro-preview` (24 chars). Picks
 * this variant for any model id containing that literal, including
 * `google/gemini-3.1-pro-preview` and any preview-suffixed alias.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  FENCE_CLOSING_BLOCK,
  OUTPUT_FORMAT_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

// Scope and uniqueness rule for the thinking block. Adapted from
// OpenAI's THINKING_ROLE_BLOCK + NO_REPEAT_BLOCK, which already address
// the same failure mode in gpt-5.4 (correct response then verbatim
// re-emission with duplicate ids). On gemini-3.1-pro the failure surfaces
// slightly differently — the model writes its reasoning in visible prose
// before the thinking block ("Thinking: **Building Table Component**\n\n
// I'm currently focused on…"), then duplicates the thinking + component
// pair after emitting them. This block addresses both the prose leak and
// the duplication by anchoring thinking to a single position.
//
// Placed mid-prompt (after FENCE_CLOSING_BLOCK, before SCOPE_DISCIPLINE)
// because gemini-3.1-pro previously regressed when an imperative
// directive sat at the LITERAL final line — the model re-read it as a
// fresh action prompt and looped. Mid-position avoids that re-read
// trigger.
const THINKING_DISCIPLINE_BLOCK = `## Thinking Block

The first three characters of your response are \`\`\`\` \`\`\` \`\`\`\` (three backticks) followed by \`mdma\`, opening a thinking block. Nothing precedes it — no greeting, no Markdown heading, no prose starting with "Thinking:" or "**Building X**" or "I'm currently…". All planning (what to build, which fields to include, why certain values are chosen) belongs inside that single thinking block.

After the thinking block's closing \`\`\`\` \`\`\` \`\`\`\`, generate the requested components in sequence. Each component — including the thinking block itself — appears exactly once. Every \`id\` is unique within your response and uses lowercase-kebab-case (no date prefixes, no underscores, no uppercase). The response ends immediately after the closing \`\`\`\` \`\`\` \`\`\`\` of the last component; do not re-emit, re-explain, or restart any part of your output.`;

export const MDMA_AUTHOR_PROMPT_GEMINI_3_1_PRO_PREVIEW = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${FENCE_CLOSING_BLOCK}

${THINKING_DISCIPLINE_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
