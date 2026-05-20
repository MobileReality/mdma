/**
 * MDMA Fixer Prompt — OpenAI GPT-4.1-mini variant.
 *
 * Adds TABLE_KEY_DIRECTION_BLOCK on top of the base. The shared
 * MDMA_FIXER_TABLES_CHARTS extension offers two equally-valid fixes for
 * "Data key does not match any column": rename data keys, or rename
 * columns. gpt-4.1-mini deterministically picks the column-rename
 * direction, but tests (and downstream consumers) treat the column keys
 * as the source of truth — so this variant must prefer renaming data
 * keys to match the existing columns.
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

export const MDMA_FIXER_PROMPT_GPT_4_1_MINI = `${MDMA_FIXER_BASE}

${CRITICAL_OUTPUT_LINE}
${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${TABLE_KEY_DIRECTION_BLOCK}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}`;
