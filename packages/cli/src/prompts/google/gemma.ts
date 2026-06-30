/**
 * Master Prompt — Google Gemma variant (whole family).
 *
 * Covers Google's open-weights Gemma models via OpenRouter — Gemma 4
 * (26B-a4b / 31B) and Gemma 3n (4B). Two Gemma-specific adjustments over the
 * default `MASTER_PROMPT`:
 *
 * 1. Multi-shot examples. Like the Haiku variant, a small open model leans far
 *    more on worked examples than on instructions — with too few it slips into
 *    JSON-shaped example blocks. The prompt-builder eval reproduced exactly
 *    this: on the 2-step KYC flow Gemma emitted JSON instead of YAML in 2 of 4
 *    example blocks. The five worked examples (all YAML) anchor the format.
 *
 * 2. A trailing flow-fidelity block. Gemma tends to broaden the specified
 *    trigger conditions — e.g. on the single-form KYC eval case it appended
 *    "or expresses a desire to begin a new verification process" to the listed
 *    keywords, which the faithful-reproduction rubric penalizes. The block
 *    instructs it to reproduce the configured triggers verbatim.
 *
 * 3. A trailing YAML-enforcement block. Per Google's Vertex guide, the most
 *    critical negative constraint goes LAST, so the "every mdma block is a YAML
 *    mapping, never JSON" rule is repeated as the final line.
 *
 * Composition:
 *   BASE_HEADER
 *     + <examples> (5 YAML worked examples — KYC included, the failing case)
 *     + BASE_FOOTER
 *     + FLOW_FIDELITY_BLOCK      (negative constraint)
 *     + YAML_ENFORCEMENT_BLOCK   (negative constraint — last)
 */

import {
  BASE_FOOTER,
  BASE_HEADER,
  EXAMPLE_CONSULTATION_BOOKING,
  EXAMPLE_EXPENSE_APPROVAL,
  EXAMPLE_KYC,
  EXAMPLE_ORDER_FULFILLMENT,
  EXAMPLE_SUPPORT_INTAKE,
} from './_shared.js';

/**
 * Single-use, Gemma-specific. Kept inline (not in `_shared.ts`) since no other
 * variant composes it. Targets the observed failure mode: example `mdma` blocks
 * serialized as JSON instead of YAML.
 */
const YAML_ENFORCEMENT_BLOCK = `## Final Rule — Examples Are Always YAML

Every \`\`\`mdma example block you write MUST be a YAML mapping: the first line is a \`key: value\` pair (e.g. \`type: form\`), fields are indented with spaces, and lists use \`-\`. Never emit a JSON object — no \`{\`, \`}\`, \`"key":\`, or comma-separated entries inside an \`\`\`mdma block. A block that begins with \`{\` is invalid and will be rejected. Write \`type: form\` on its own line, not \`{"type": "form"}\`.`;

/**
 * Single-use, Gemma-specific. Kept inline per the variant convention. Targets
 * Gemma's tendency to embellish the configured conversation flow with extra,
 * inferred trigger conditions instead of reproducing the exact ones given.
 */
const FLOW_FIDELITY_BLOCK = `## Reproduce the Configured Flow Exactly

Use the EXACT trigger conditions listed in the configuration's conversation flow — the specific keywords or events given, and nothing more. Do NOT broaden a keyword trigger with paraphrases or inferred intent (e.g. do not append "or when the user expresses a desire to…" next to the listed keywords). If the flow says a form appears on "start KYC review" / "verify identity", those two phrases are the only triggers — reproduce them verbatim, do not generalize them.`;

export const MASTER_PROMPT_GEMMA = `${BASE_HEADER}

<examples>
${EXAMPLE_CONSULTATION_BOOKING}

${EXAMPLE_SUPPORT_INTAKE}

${EXAMPLE_EXPENSE_APPROVAL}

${EXAMPLE_ORDER_FULFILLMENT}

${EXAMPLE_KYC}
</examples>

${BASE_FOOTER}

${FLOW_FIDELITY_BLOCK}

${YAML_ENFORCEMENT_BLOCK}
`;
