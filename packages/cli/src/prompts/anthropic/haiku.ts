/**
 * Master Prompt — Anthropic Haiku variant.
 *
 * Tuned for Claude Haiku 4.5. Composed from `_shared.ts`:
 *   BASE_HEADER + 4 EXAMPLE_* blocks + BASE_FOOTER
 *
 * The 4-shot example mix is the Haiku-specific differentiator. Anthropic's
 * prompt-engineering guide recommends 3–5 diverse examples, and notes that
 * "the power of examples far exceeds the power of instructions." Haiku
 * benefits more from this multi-shot mirroring than larger Claude models —
 * with only 1 worked example it tends to skip emitting fenced ```mdma blocks
 * and produces prose-only output instead.
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

export const MASTER_PROMPT_HAIKU = `${BASE_HEADER}

<examples>
${EXAMPLE_CONSULTATION_BOOKING}

${EXAMPLE_SUPPORT_INTAKE}

${EXAMPLE_EXPENSE_APPROVAL}

${EXAMPLE_ORDER_FULFILLMENT}

${EXAMPLE_KYC}
</examples>

${BASE_FOOTER}
`;
