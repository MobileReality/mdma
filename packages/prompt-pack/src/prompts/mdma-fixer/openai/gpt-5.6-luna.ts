/**
 * MDMA Fixer Prompt — OpenAI GPT-5.6 Luna variant.
 *
 * Same composition as gpt-5.6-sol (shared base + <critical_output> +
 * <preserve_input_structure>). Luna passes the fixer eval on the default
 * prompt already; the dedicated variant keeps the gpt-5.6 family consistent
 * and guards against the leading-separator prose leak seen on sol.
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
import { CRITICAL_OUTPUT_LINE, NO_LEADING_SEPARATOR_BLOCK } from './_shared.js';

export const MDMA_FIXER_PROMPT_GPT_5_6_LUNA = `${MDMA_FIXER_BASE}

${CRITICAL_OUTPUT_LINE}
${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}

${NO_LEADING_SEPARATOR_BLOCK}`;
