/**
 * MDMA Fixer Prompt — OpenAI GPT-5.5 variant.
 *
 * Starting baseline for GPT-5.5 fixer evals. Adds CRITICAL_OUTPUT_LINE
 * after the base rules — the same no-outer-fence failure mode observed on
 * GPT-5.5 in author evals applies equally to the fixer output.
 *
 * Add further framing blocks inline as specific failure modes are observed
 * during evals.
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
import { CRITICAL_OUTPUT_LINE } from './_shared.js';

/**
 * Inline block — gpt-5.5 single-block fixer evals showed the model
 * prepending a leading `---\\n\\n` (horizontal rule) before the first
 * ```mdma fence. The base rules already say "output IS the corrected
 * Markdown document" but the model still treats the rewrite as a "response
 * to a request" and inserts a separator. Placed at the very end of the
 * prompt for recency effect — placing it next to CRITICAL_OUTPUT_LINE was
 * not enough on its own.
 */
const NO_LEADING_SEPARATOR_BLOCK = `<no_leading_separator>
!IMPORTANT: The very first character of your response is the first character of the corrected Markdown document — almost always the backtick that opens \`\`\`mdma.

Do NOT prepend ANYTHING before it. Specifically:
- NO leading \`---\` horizontal rule
- NO leading blank line
- NO preamble like "Here is the corrected document:" or "Sure, here you go:"
- NO outer code fence

WRONG (do NOT do this):
\`\`\`
---

\`\`\`mdma
type: callout
...
\`\`\`
\`\`\`

RIGHT (start your response exactly like this):
\`\`\`
\`\`\`mdma
type: callout
...
\`\`\`
\`\`\`
</no_leading_separator>`;

export const MDMA_FIXER_PROMPT_GPT_5_5 = `${MDMA_FIXER_BASE}

${CRITICAL_OUTPUT_LINE}
${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}

${NO_LEADING_SEPARATOR_BLOCK}`;
