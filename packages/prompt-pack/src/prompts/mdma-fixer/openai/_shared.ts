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
