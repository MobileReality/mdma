/**
 * Shared content for MDMA-Fixer Google (Gemini) variants.
 *
 * Format choice: Markdown (`##` headers) rather than XML tags. Google's
 * Gemini 3 prompting guide says to pick one structural format and stay
 * consistent — "use either XML-style tagging OR Markdown consistently;
 * mixing them confuses the model." `MDMA_FIXER_BASE` and the extensions
 * use Markdown headings, so Markdown wins for Gemini.
 *
 * Sibling of `mdma-fixer/openai/_shared.ts` and
 * `mdma-fixer/anthropic/_shared.ts`. The `_` filename prefix is recognized
 * by `evals/select-prompt.mjs` and skipped during variant discovery.
 *
 * Note: block CONTENT is duplicated across vendor `_shared.ts` files.
 * Redundancy is preferred over cross-vendor imports — each vendor folder
 * stays self-contained, so a Google-specific tweak here doesn't
 * accidentally affect other vendors' variants.
 */

/**
 * Anchors the model's output format at the top of the prompt. Same intent
 * as `openai/_shared.ts:CRITICAL_OUTPUT_LINE` and
 * `anthropic/_shared.ts:OUTPUT_FORMAT_BLOCK`, but rendered as a Markdown
 * heading rather than a CAPS sentence or XML tag — Gemini follows the
 * heading-style instruction more reliably.
 */
export const OUTPUT_FORMAT_BLOCK = `## Output Format

Your output IS the corrected Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.`;

/**
 * Forbids inventing surrounding Markdown structure (headings, descriptive
 * paragraphs, horizontal rules) around a bare \`\`\`mdma block. Mirrors
 * the OpenAI and Anthropic siblings in intent; placed at the very end of
 * a variant's prompt for recency effect (Vertex guidance: "negative
 * constraints should be placed at the end of the instruction").
 *
 * Same content as openai/anthropic siblings — duplicated by hand to keep
 * each vendor folder self-contained.
 */
export const PRESERVE_INPUT_STRUCTURE_BLOCK = `## Preserve Input Structure

!IMPORTANT: Preserve the structure of the input document exactly. If the input is a bare \`\`\`mdma block with no surrounding Markdown, your output is a bare \`\`\`mdma block with no surrounding Markdown.

Do NOT invent surrounding context. Specifically, never add:
- A Markdown heading (\`# Contact Form\`, \`## Form\`, etc.) above the block
- A descriptive paragraph above or below the block ("Please tell us how…", "Here is the corrected form:")
- A \`---\` horizontal rule
- A blank line prefix or any leading whitespace before the first \`\`\`mdma fence

The very first character of your response is the backtick that opens \`\`\`mdma. The very last character is the third backtick of the closing fence. Nothing before, nothing after.

WRONG (do NOT do this):
\`\`\`
# Contact Form

Please fill out the form below.

\`\`\`mdma
type: form
...
\`\`\`
\`\`\`

RIGHT (start your response exactly like this):
\`\`\`
\`\`\`mdma
type: form
...
\`\`\`
\`\`\`
`;

/**
 * Pins the direction of fix for "data key does not match any column"
 * errors: rename the data keys to match the column keys, NOT the other
 * way around. The shared MDMA_FIXER_TABLES_CHARTS extension calls both
 * directions valid, but downstream consumers treat the column keys as
 * the source of truth.
 *
 * Observed on gemini-3.1-flash-lite-preview and gemini-2.5-flash-lite;
 * same failure pattern also seen on openai/gpt-4.1-mini and
 * anthropic/haiku (those keep their own inline copies — promote here if
 * future Google variants need it too).
 */
export const TABLE_KEY_DIRECTION_BLOCK = `## Table Key Direction

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

The correct fix renames \`product_name\` → \`product\` and \`total_revenue\` → \`revenue\` in the data rows, leaving the columns untouched. Renaming the columns to \`product_name\` / \`total_revenue\` is wrong even though it also resolves the error.`;
