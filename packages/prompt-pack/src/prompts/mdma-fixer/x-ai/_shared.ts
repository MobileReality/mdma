/**
 * Shared content for MDMA-Fixer xAI (Grok) variants.
 *
 * Format choice: Markdown (`##` headers) rather than XML tags. xAI's
 * Grok prompting playbook flags that the model responds unpredictably
 * to "pseudo system/persona toggles and long, heavily instrumented
 * prompt headers" — published guidance recommends keeping master
 * prompts "boring" with a clean hierarchical structure. The cross-
 * variant base (`MDMA_FIXER_BASE` and extensions) is already heavily
 * Markdown-headed, so Markdown stays consistent.
 *
 * Sibling of `mdma-fixer/openai/_shared.ts`,
 * `mdma-fixer/anthropic/_shared.ts`, and `mdma-fixer/google/_shared.ts`.
 * The `_` filename prefix is recognized by `evals/select-prompt.mjs`
 * and skipped during variant discovery.
 */

export const OUTPUT_FORMAT_BLOCK = `## Output Format

Your output IS the corrected Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically.`;

/**
 * Same intent as the openai/anthropic/google siblings — forbid inventing
 * surrounding Markdown structure around a bare ```mdma block. Content
 * duplicated by hand to keep each vendor folder self-contained.
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
