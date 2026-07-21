/**
 * MDMA Fixer Prompt — Google Gemini 3.5 Flash variant.
 *
 * Mirrors the Gemini flash fixer composition (<output_format> + base + all
 * extensions + <preserve_input_structure>). Gemini 3.5 Flash already passes
 * the fixer eval 16/16 on the default fixer; the dedicated variant keeps it
 * aligned with the rest of the Gemini lineup. Reasoning-token leakage is
 * handled at the API layer (reasoning.exclude), not the prompt.
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

/**
 * Inline block — gemini-3.5-flash consistently (2/2 runs) prepended a leading
 * `---\n\n` horizontal rule before the first ```mdma fence on the placeholder-
 * callout fix (fixer-no-prose, 3 chars), the same stubborn behavior gpt-5.6-sol
 * showed. <preserve_input_structure> forbids it but Flash ignores it; this
 * blunter, end-placed restatement (Gemini-native Markdown) stops the prepend.
 * Single-use, so it lives inline rather than in google/_shared.ts.
 */
const NO_LEADING_SEPARATOR_BLOCK = `## No Leading Separator

!IMPORTANT: The very first character of your response is the first character of the corrected document — the backtick that opens \`\`\`mdma. Do NOT prepend ANYTHING before it: no leading \`---\` horizontal rule, no blank line, no preamble ("Here is the corrected document:"), no outer code fence. Start your response directly with \`\`\`mdma.`;

export const MDMA_FIXER_PROMPT_GEMINI_3_5_FLASH = `${OUTPUT_FORMAT_BLOCK}

${MDMA_FIXER_BASE}

${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}

${PRESERVE_INPUT_STRUCTURE_BLOCK}

${NO_LEADING_SEPARATOR_BLOCK}`;
