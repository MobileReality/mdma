/**
 * MDMA Fixer Prompt — Anthropic Fable 5 variant.
 *
 * Mirrors the Anthropic flagship fixer composition (base + <output_format> +
 * all extensions + <preserve_input_structure>). On the default fixer, fable-5
 * leaked a short prose fragment before the ```mdma block (fixer-no-prose,
 * 1/16); the <preserve_input_structure> guard takes it to 16/16. Reasoning-
 * token leakage is handled at the API layer (reasoning.exclude in
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

export const MDMA_FIXER_PROMPT_FABLE_5 = `${MDMA_FIXER_BASE}

${OUTPUT_FORMAT_BLOCK}
${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}

${PRESERVE_INPUT_STRUCTURE_BLOCK}`;
