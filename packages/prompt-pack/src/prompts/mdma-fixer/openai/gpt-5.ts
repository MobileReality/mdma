/**
 * MDMA Fixer Prompt — OpenAI GPT-5 variant.
 *
 * Starting baseline mirroring the other gpt-5.x fixer variants
 * (base + CRITICAL_OUTPUT_LINE + all extensions). Add inline framing
 * blocks here as failure modes surface during evals.
 *
 * Routing note: `gpt-5` is a substring of every other gpt-5.x filename, but
 * the longest-match rule in `evals/select-prompt.mjs` ensures `gpt-5.5`,
 * `gpt-5.4`, etc. still pick their dedicated variants. This file only
 * matches the exact model id `gpt-5`.
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

export const MDMA_FIXER_PROMPT_GPT_5 = `${MDMA_FIXER_BASE}

${CRITICAL_OUTPUT_LINE}
${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}`;
