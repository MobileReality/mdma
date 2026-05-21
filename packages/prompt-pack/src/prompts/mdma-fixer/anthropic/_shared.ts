/**
 * Shared content for MDMA-Fixer Anthropic variants.
 *
 * Each Anthropic variant composes a subset of these blocks via template-
 * literal interpolation. Sibling of `mdma-fixer/openai/_shared.ts`. The `_`
 * filename prefix is recognized by `evals/select-prompt.mjs` and skipped
 * during variant discovery.
 *
 * Add blocks here when a failure mode is observed across multiple Claude
 * variants. Single-variant blocks live inline in their variant file.
 */

/**
 * Anthropic-flavored output framing — wraps the same intent as
 * `openai/_shared.ts:CRITICAL_OUTPUT_LINE` in an `<output_format>` tag,
 * which Claude follows more reliably than a CAPS sentence. The fixer
 * still emits the corrected Markdown document directly (no outer fence).
 */
export const OUTPUT_FORMAT_BLOCK = `<output_format>
Your output IS the corrected Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.
</output_format>`;

/**
 * Forbids inventing surrounding Markdown structure (headings, descriptive
 * paragraphs, horizontal rules) around a bare \`\`\`mdma block. Observed
 * on opus-4.7 — wrapped a bare form block with \`# New Project Intake\` +
 * "Please provide the details for your new project below."
 *
 * Same content as \`openai/_shared.ts:PRESERVE_INPUT_STRUCTURE_BLOCK\` —
 * duplicated by hand to keep each vendor folder self-contained.
 *
 * Placed at the very end of a variant's prompt for recency effect.
 */
export const PRESERVE_INPUT_STRUCTURE_BLOCK = `<preserve_input_structure>
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
</preserve_input_structure>`;
