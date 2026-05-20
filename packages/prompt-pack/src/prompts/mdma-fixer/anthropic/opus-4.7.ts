/**
 * MDMA Fixer Prompt — Anthropic Claude Opus 4.7 variant.
 *
 * Starting baseline mirroring the openai fixer variants
 * (base + OUTPUT_FORMAT_BLOCK + all extensions), but with Anthropic-style
 * XML framing instead of the CAPS critical line. Add inline framing
 * blocks here as failure modes surface during evals.
 *
 * Routing note: this file matches model ids containing literal `opus-4.7`.
 * The selector's longest-substring match picks it over `opus-4.6.ts` for
 * `claude-opus-4.7`. Floating aliases like `claude-opus-latest` do NOT
 * route here — pin an explicit version in EVAL_PROVIDER.
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

export const MDMA_FIXER_PROMPT_OPUS_4_7 = `${MDMA_FIXER_BASE}

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
