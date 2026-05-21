/**
 * Custom promptfoo assertion for fixer eval.
 *
 * Enforces that the fixer output contains ONLY ```mdma blocks — no prose,
 * headings, intro/outro text, or commentary outside the blocks. The fixer's
 * job is to repair MDMA blocks, not to converse with the user.
 *
 * Allowed in the output: ```mdma blocks and whitespace between them.
 * Disallowed: prose paragraphs, Markdown headings, lists, code fences other
 * than `mdma`, or any text outside a ```mdma ... ``` pair.
 */
export default function (output) {
  // Strip every ```mdma ... ``` block (greedy across newlines, non-greedy on content)
  const stripped = output.replace(/```mdma\n[\s\S]*?```/g, '').trim();

  if (stripped.length === 0) {
    return {
      pass: true,
      score: 1,
      reason: 'Fixer output contains only ```mdma blocks (no prose)',
    };
  }

  // Truncate the offending content for the failure message
  const preview = stripped.length > 200 ? `${stripped.slice(0, 200)}...` : stripped;
  return {
    pass: false,
    score: 0,
    reason: `Fixer output contains non-mdma content (${stripped.length} chars):\n${preview}`,
  };
}
