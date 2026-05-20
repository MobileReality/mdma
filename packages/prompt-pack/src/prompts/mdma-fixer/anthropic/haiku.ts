/**
 * MDMA Fixer Prompt — Anthropic Claude Haiku variant.
 *
 * Composes MDMA_FIXER_BASE + OUTPUT_FORMAT_BLOCK + all extensions +
 * PRESERVE_INPUT_STRUCTURE_BLOCK + TABLE_KEY_DIRECTION_BLOCK (inline).
 *
 * Haiku consistently fixes "data key does not match any column" by
 * renaming the columns to match the data instead of the other way around
 * — same failure as gpt-4.1-mini. The shared MDMA_FIXER_TABLES_CHARTS
 * extension lists both directions as valid, so a Haiku-specific rule is
 * needed to pin the preferred direction.
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

const TABLE_KEY_DIRECTION_BLOCK = `<table_key_direction>
When a table's data keys do not match its column keys, treat the COLUMN keys as the source of truth and rename the data keys to match them. Do NOT rename the columns to match the data.

Example — given this broken block:

\`\`\`mdma
type: table
columns:
  - key: product
  - key: revenue
data:
  - product_name: Widget A
    total_revenue: 50000
\`\`\`

The correct fix renames \`product_name\` → \`product\` and \`total_revenue\` → \`revenue\` in the data rows, leaving the columns untouched. Renaming the columns to \`product_name\` / \`total_revenue\` is wrong even though it also resolves the error.
</table_key_direction>`;

export const MDMA_FIXER_PROMPT_HAIKU = `${MDMA_FIXER_BASE}

${OUTPUT_FORMAT_BLOCK}
${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${TABLE_KEY_DIRECTION_BLOCK}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}

${PRESERVE_INPUT_STRUCTURE_BLOCK}`;
