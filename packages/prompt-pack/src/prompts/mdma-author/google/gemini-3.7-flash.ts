/**
 * MDMA Author Prompt — Google Gemini 3.7 Flash variant.
 *
 * Same composition as `./gemini-3.5-flash.ts`. A "Response Start" block
 * (no pre-answer prose, reasoning only inside the `thinking` block, no
 * draft-and-restart) was tried and had no effect (pass rate 93/95 vs 94/95).
 * The visible "Thinking: ..." preamble seen in ~96% of eval outputs is added
 * by promptfoo, which prepends the response's separate `reasoning` field to
 * the output; a raw OpenRouter call returns content that starts directly with
 * the ```mdma block. It is not something this prompt needs to suppress.
 *
 * Routing: substring match on `gemini-3.7-flash` (normalized `gemini-3-7-flash`).
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  EMIT_COMPONENT_BLOCK,
  FENCE_CLOSING_BLOCK,
  OUTPUT_FORMAT_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GEMINI_3_7_FLASH = `${BASE_OPENING}

${OUTPUT_FORMAT_BLOCK}

${BASE_BODY}

${FENCE_CLOSING_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${EMIT_COMPONENT_BLOCK}

${BASE_CHECKLIST}
`;
