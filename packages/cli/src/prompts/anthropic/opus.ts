/**
 * Master Prompt — Anthropic Opus variant.
 *
 * Tuned for Claude Opus 4.x. Composed from `_shared.ts`:
 *   BASE_HEADER + 1 EXAMPLE_* block + BASE_FOOTER
 *
 * Opus is Anthropic's most capable model and follows the explicit instruction
 * "If the configuration has 2 forms, include 2 blocks" in `BASE_FOOTER`
 * reliably without needing repeated multi-shot mirroring. A single rich
 * example (KYC: multi-component output with sensitive PII and a conditional
 * callout) is enough to lock the format. Drop to 0 examples and Opus still
 * mostly works, but 1 cheap-token example reduces variance on edge cases.
 */

import {
  BASE_FOOTER,
  BASE_HEADER,
  EXAMPLE_CONSULTATION_BOOKING,
  EXAMPLE_KYC,
  EXAMPLE_ORDER_FULFILLMENT,
} from './_shared.js';

export const MASTER_PROMPT_OPUS = `${BASE_HEADER}

<examples>
${EXAMPLE_CONSULTATION_BOOKING}

${EXAMPLE_ORDER_FULFILLMENT}

${EXAMPLE_KYC}
</examples>

${BASE_FOOTER}
`;
