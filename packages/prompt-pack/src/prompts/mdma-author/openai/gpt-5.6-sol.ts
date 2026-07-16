/**
 * MDMA Author Prompt — OpenAI GPT-5.6 Sol variant.
 *
 * One of the three gpt-5.6 sibling models (sol / terra / luna). All three start
 * from the proven gpt-5.5 flagship composition — gpt-5.5 scores 33/33 on the
 * author suite, so it is the safe baseline for its successor:
 *
 *   BASE_OPENING + CRITICAL_OUTPUT_LINE + <scope_discipline> +
 *     <component_types> + <single_interactive> + <select_options> +
 *     BASE_BODY + BASE_CHECKLIST
 *
 * The three siblings share this baseline pending per-model eval data — no
 * public gpt-5.6 prompting guidance exists yet, and sol/terra/luna have no
 * observed failure modes. Diverge THIS file (add e.g. <fence_closing> for a
 * missing-closing-fence pattern, or the mini/nano defensive blocks) only once
 * a Sol-specific failure appears in the eval suite; keep terra/luna independent.
 *
 * The `custom` envelope docs and string-select-value rule come from BASE_BODY;
 * <select_options> reinforces the latter for the star-rating custom scenario.
 *
 * Routing: substring match on `gpt-5.6-sol` (normalized `gpt-5-6-sol`). The
 * `-sol` suffix keeps it distinct from `-terra` / `-luna` and from the 5.4/5.5
 * filenames; a future bare `gpt-5.6.ts` would lose the longest-match tie to
 * this more-specific file.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  CRITICAL_OUTPUT_LINE,
  INTERACTIVE_TYPES_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
  SINGLE_INTERACTIVE_BLOCK,
} from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GPT_5_6_SOL = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${SCOPE_DISCIPLINE_BLOCK}

${INTERACTIVE_TYPES_BLOCK}

${SINGLE_INTERACTIVE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
