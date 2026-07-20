/**
 * MDMA Fixer Prompt — xAI Grok 4.5 variant.
 *
 * Mirrors the Grok 4.20 fixer minus the 4.20-specific <fix_all_listed_errors>
 * block (that partial-fix pattern was not observed on 4.5). Grok 4.5 is a
 * hidden-reasoning model, so the explicit output contract up top is safe, and
 * it already passes the fixer eval 16/16 on the default fixer. Reasoning-token
 * leakage is stripped at the API layer (reasoning.exclude in
 * evals/promptfooconfig.fixer.js), not the prompt.
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
import { OUTPUT_FORMAT_BLOCK, PRESERVE_INPUT_STRUCTURE_BLOCK } from './_shared.js';

export const MDMA_FIXER_PROMPT_GROK_4_5 = `${OUTPUT_FORMAT_BLOCK}

${MDMA_FIXER_BASE}

${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}

${PRESERVE_INPUT_STRUCTURE_BLOCK}`;
