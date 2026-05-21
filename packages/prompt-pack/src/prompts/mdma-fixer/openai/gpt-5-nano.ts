/**
 * MDMA Fixer Prompt — OpenAI GPT-5-nano variant.
 *
 * Adds PRESERVE_INPUT_STRUCTURE_BLOCK on top of the base — nano exhibited
 * the full grab-bag of "extra stuff around the block" failures: leading
 * `---`, outer ```...``` wrapper fence, hallucinated thinking/callout
 * blocks, and trailing horizontal rules.
 *
 * Known flakiness: residual one-off failures (~1/15) survive even with the
 * block — sometimes the model returns empty output, sometimes a stray
 * leading `---`. Reruns commonly pass 15/15. Don't chase the residual.
 *
 * Routing note: `gpt-5-nano` doesn't substring-match `gpt-5.4-nano`
 * (different separator), so this file only routes the exact id `gpt-5-nano`.
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

export const MDMA_FIXER_PROMPT_GPT_5_NANO = `${MDMA_FIXER_BASE}

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
