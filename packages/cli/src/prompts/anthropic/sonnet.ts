/**
 * Master Prompt — Anthropic Sonnet variant.
 *
 * Tuned for Claude Sonnet 4.x. Composed from `_shared.ts`:
 *   BASE_HEADER + 2 EXAMPLE_* blocks + BASE_FOOTER
 *
 * Sonnet's adherence to format requirements is reliable enough that the 2
 * most-diverse examples (a simple single-step intake form and a multi-component
 * flow with sensitive PII + callout) are sufficient — Haiku's 4-shot
 * format-mirroring is overkill at this tier.
 */

import {
  BASE_FOOTER,
  BASE_HEADER,
  EXAMPLE_CONSULTATION_BOOKING,
  EXAMPLE_KYC,
  EXAMPLE_ORDER_FULFILLMENT,
  EXAMPLE_SUPPORT_INTAKE,
} from './_shared.js';

export const MASTER_PROMPT_SONNET = `${BASE_HEADER}

<examples>
${EXAMPLE_CONSULTATION_BOOKING}

${EXAMPLE_SUPPORT_INTAKE}

${EXAMPLE_ORDER_FULFILLMENT}

${EXAMPLE_KYC}
</examples>

${BASE_FOOTER}
`;
