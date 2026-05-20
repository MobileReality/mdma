/**
 * MDMA Fixer Prompt — OpenAI GPT-5.4 variant.
 *
 * Starting baseline for GPT-5.4 fixer evals. Mirrors the gpt-5.5 fixer
 * baseline (base + CRITICAL_OUTPUT_LINE) — gpt-5.4 shares the same
 * no-outer-fence failure mode on fixer output.
 *
 * Add further framing blocks inline as specific failure modes are observed
 * during evals (e.g. duplication, fence-closing).
 */

import {
  MDMA_FIXER_APPROVAL,
  MDMA_FIXER_BASE,
  MDMA_FIXER_BINDINGS,
  MDMA_FIXER_EXAMPLES,
  MDMA_FIXER_FLOW,
  MDMA_FIXER_FORMS,
  MDMA_FIXER_PII,
  MDMA_FIXER_STRUCTURE,
  MDMA_FIXER_TABLES_CHARTS,
} from '../_shared.js';
import { CRITICAL_OUTPUT_LINE } from './_shared.js';

export const MDMA_FIXER_PROMPT_GPT_5_4 = `${MDMA_FIXER_BASE}

${CRITICAL_OUTPUT_LINE}
${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}`;
