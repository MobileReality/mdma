/**
 * MDMA Author Prompt — Google Gemini 3.8 Flash variant.
 *
 * Baseline: the same composition as `./gemini-3.5-flash.ts`, carried over unchanged
 * because no Google Gemini 3.8 Flash-specific failure mode has been observed yet. Diverge THIS
 * file (add or drop framing blocks) only once an eval run shows a pattern
 * specific to this model; keep sibling variants independent.
 *
 * Routing: substring match on `gemini-3.8-flash` (normalized `gemini-3-8-flash`).
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  EMIT_COMPONENT_BLOCK,
  FENCE_CLOSING_BLOCK,
  OUTPUT_FORMAT_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GEMINI_3_8_FLASH = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${FENCE_CLOSING_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${EMIT_COMPONENT_BLOCK}

${BASE_CHECKLIST}
`;
