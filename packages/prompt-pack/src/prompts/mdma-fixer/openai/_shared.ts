/**
 * Shared content for MDMA-Fixer OpenAI variants.
 *
 * Add blocks here when a failure mode is observed across multiple GPT variants.
 * Single-variant blocks live inline in their variant file, not here.
 * The `_` filename prefix is recognized by `evals/select-prompt.mjs` and
 * skipped during variant discovery.
 */

/**
 * Reinforces rule #5 of the fixer base — GPT models occasionally wrap their
 * output in an outer ```markdown fence instead of emitting the Markdown
 * document directly. Placed after the base rules and before extensions so it
 * stands out as an additional emphasis.
 */
export const CRITICAL_OUTPUT_LINE =
  'CRITICAL: Your output IS the corrected Markdown document — write headings, paragraphs, and ```mdma blocks directly. NEVER wrap your response in ```markdown code fences. Your response is already rendered as Markdown.';

/**
 * Forbids inventing surrounding Markdown structure (headings, descriptive
 * paragraphs, horizontal rules) around a bare ```mdma block. Observed on
 * gpt-5.4-mini and gpt-5.4-nano fixer evals — both wrapped single-block
 * inputs with `# Contact Form` headings and "Please fill out…" preambles.
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

/**
 * Stronger, more specific variant of <preserve_input_structure> targeting the
 * stubborn leading-`---` prepend. GPT-5.x fixer evals (gpt-5.5, gpt-5.6-sol)
 * showed the model inserting a `---\\n\\n` horizontal rule before the first
 * ```mdma fence even with <preserve_input_structure> present — it treats the
 * rewrite as a "response to a request" and adds a separator. This block is
 * blunter and MUST be placed at the very END of the variant's prompt for
 * recency effect (next to CRITICAL_OUTPUT_LINE was not enough).
 */
export const NO_LEADING_SEPARATOR_BLOCK = `<no_leading_separator>
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
