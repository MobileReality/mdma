/**
 * MDMA Fixer Prompt — OpenAI GPT-4.1-nano variant.
 *
 * Adds PRESERVE_INPUT_STRUCTURE_BLOCK on top of the base — nano prepends
 * a leading `---\\n` horizontal rule before the first ```mdma fence
 * (same pattern seen across gpt-5.5, gpt-5.2, gpt-5-mini, gpt-5-nano).
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
import { CRITICAL_OUTPUT_LINE, PRESERVE_INPUT_STRUCTURE_BLOCK } from './_shared.js';

/**
 * Reinforces rule 8 of MDMA_FIXER_BASE — gpt-4.1-nano fixes the title
 * placeholder (\`TBD\`) but leaves the content placeholder (\`Lorem ipsum
 * dolor sit amet\`) untouched when both appear in the same component. The
 * model treats one placeholder fix as "the job is done". Placed at the
 * very end of the prompt for recency effect — putting it earlier in the
 * prompt was not enough on its own.
 */
const REPLACE_ALL_PLACEHOLDERS_BLOCK = `<replace_all_placeholders>
!IMPORTANT: A SINGLE COMPONENT can contain MULTIPLE placeholder fields. Replacing ONE is not enough — every placeholder field in every component must be replaced.

Placeholder markers to detect and replace:
- TODO, TBD, FIXME
- "..." or "…" used as content
- "Lorem ipsum" (case-insensitive, any continuation)
- "placeholder", "sample", "example" used as content
- Empty-but-required strings, single-character labels

WRONG (only title fixed, \`content\` still placeholder):
\`\`\`mdma
type: callout
id: project-summary
variant: info
title: Project Summary
content: Lorem ipsum dolor sit amet
\`\`\`

RIGHT (BOTH title AND content replaced with real content):
\`\`\`mdma
type: callout
id: project-summary
variant: info
title: Project Summary
content: This page summarizes the project's goals, current status, and next milestones.
\`\`\`

Before emitting your final output, re-read every field of every component and confirm no placeholder marker survives. If one does, rewrite it.
</replace_all_placeholders>`;

export const MDMA_FIXER_PROMPT_GPT_4_1_NANO = `${MDMA_FIXER_BASE}

${CRITICAL_OUTPUT_LINE}
${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}

${PRESERVE_INPUT_STRUCTURE_BLOCK}

${REPLACE_ALL_PLACEHOLDERS_BLOCK}`;
