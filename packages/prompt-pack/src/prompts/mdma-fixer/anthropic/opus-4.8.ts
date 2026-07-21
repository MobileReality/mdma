/**
 * MDMA Fixer Prompt — Anthropic Claude Opus 4.8 variant.
 *
 * Mirrors opus-4.7 (base + <output_format> + all extensions +
 * <preserve_input_structure>). On the default fixer, opus-4.8 leaked a short
 * prose fragment before the ```mdma block (fixer-no-prose, 1/16); the
 * <preserve_input_structure> guard forbids leading separators/preambles and
 * takes it to 16/16.
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

export const MDMA_FIXER_PROMPT_OPUS_4_8 = `${MDMA_FIXER_BASE}

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
