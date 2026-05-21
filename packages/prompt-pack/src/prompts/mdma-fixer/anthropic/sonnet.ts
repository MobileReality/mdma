/**
 * MDMA Fixer Prompt — Anthropic Claude Sonnet variant (catch-all).
 *
 * Composes MDMA_FIXER_BASE + OUTPUT_FORMAT_BLOCK + all extensions +
 * PRESERVE_INPUT_STRUCTURE_BLOCK at the end.
 *
 * Add inline framing blocks here as Sonnet-specific failure modes surface
 * during evals.
 *
 * Routing: the longest-substring matcher in `evals/select-prompt.mjs`
 * picks `sonnet.ts` for any model id containing literal `sonnet` —
 * `claude-sonnet-4-5`, `claude-sonnet-4-6`, etc. If a version-specific
 * tweak is needed later, add a sibling `sonnet-X.Y.ts`; the longest-match
 * rule will route that id to the more-specific file.
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

export const MDMA_FIXER_PROMPT_SONNET = `${MDMA_FIXER_BASE}

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
