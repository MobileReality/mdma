/**
 * MDMA Fixer Prompt — OpenAI GPT-5.6 Sol variant.
 *
 * On the default fixer, gpt-5.6-sol leaked a few characters of prose before
 * the first ```mdma fence (fixer-no-prose, 3/16 cases) — the same
 * leading-separator failure the gpt-5.5 fixer variant guards against. Composes
 * the shared fixer base + <critical_output> + <preserve_input_structure>,
 * which forbids leading `---`/blank lines/preambles and takes sol to 16/16.
 * Its siblings (terra/luna) already pass on the default fixer but carry the
 * same variant for family consistency.
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

export const MDMA_FIXER_PROMPT_GPT_5_6_SOL = `${MDMA_FIXER_BASE}

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
