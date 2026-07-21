/**
 * MDMA Author Prompt — OpenAI GPT-4.1-nano variant.
 *
 * Smallest tier of the gpt-4.1 family — same all-three framing as
 * `gpt-5.4-nano.ts` and `gpt-5-nano.ts` (<fence_closing> +
 * <scope_discipline> + <select_options>) plus one nano-exclusive
 * single-paragraph note inserted after fence_closing.
 *
 * The note addresses a gpt-4.1-nano-specific failure where the model
 * inserts `---` markdown horizontal rules between MDMA blocks instead
 * of closing fences. We tested several richer formats (XML-tagged blocks,
 * worked examples, WRONG/CORRECT comparisons, BASE_BODY edits) — they
 * all regressed the suite from 2 failures to 9. This plain single-paragraph
 * inline string sits at the floor of 2 failures and stays there.
 *
 * Lesson: for gpt-4.1-nano, more elaborate scaffolding hurts. The single
 * emphatic sentence is the prompt-only optimum.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  CRITICAL_OUTPUT_LINE,
  CUSTOM_USAGE_BLOCK,
  FENCE_CLOSING_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
} from './_shared.js';

const NO_HORIZONTAL_RULE_NOTE =
  'The closing ```` ``` ```` is the ONLY thing that ends a fenced block. Markdown horizontal rules (`---`), blank lines, and new ```` ```mdma ```` openings do not close a block — they are seen as text inside the still-open block. After every component, write ```` ``` ```` on its own line, then a blank line, then the next ```` ```mdma ```` if there is another component.';

export const MDMA_AUTHOR_PROMPT_GPT_4_1_NANO = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${FENCE_CLOSING_BLOCK}

${NO_HORIZONTAL_RULE_NOTE}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${CUSTOM_USAGE_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
