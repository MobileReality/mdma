/**
 * MDMA Fixer Prompt — OpenAI GPT-5-mini variant.
 *
 * Adds PRESERVE_INPUT_STRUCTURE_BLOCK on top of the base — gpt-5-mini
 * prepends a leading `---\\n\\n` horizontal rule before the first ```mdma
 * fence (same pattern seen on gpt-5.5 and gpt-5.2).
 *
 * Known flakiness: the leading-`---` failure is stochastic on gpt-5-mini —
 * the block suppresses it most of the time but it still leaks in ~1/15
 * tests on a bad run. Reruns commonly pass 15/15. Don't chase the residual
 * — strengthening the block further didn't help the flagships either.
 *
 * Routing note: `gpt-5-mini` doesn't substring-match `gpt-5.4-mini`
 * (different separator), so this file only routes the exact id `gpt-5-mini`.
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
import { CRITICAL_OUTPUT_LINE, PRESERVE_INPUT_STRUCTURE_BLOCK } from './_shared.js';

export const MDMA_FIXER_PROMPT_GPT_5_MINI = `${MDMA_FIXER_BASE}

${CRITICAL_OUTPUT_LINE}
${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}

${PRESERVE_INPUT_STRUCTURE_BLOCK}`;
