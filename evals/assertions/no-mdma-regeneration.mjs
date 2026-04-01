/**
 * Asserts that the follow-up response does NOT contain full MDMA code blocks.
 *
 * After the initial generation, follow-up turns (tone changes, clarifications,
 * field tweaks) should produce conversational responses — not regenerate the
 * entire MDMA document from scratch.
 */
export default function (output) {
  const mdmaBlocks = [...output.matchAll(/```mdma\n([\s\S]*?)```/g)];

  // Thinking blocks are always required by the MDMA spec — don't count them as regeneration
  const nonThinking = mdmaBlocks.filter((m) => !/^\s*type:\s*thinking\b/m.test(m[1]));

  if (nonThinking.length === 0) {
    return {
      pass: true,
      score: 1,
      reason: 'No MDMA blocks regenerated — conversational reply only',
    };
  }

  return {
    pass: false,
    score: 0,
    reason: `Expected no MDMA blocks in follow-up, but found ${nonThinking.length} non-thinking block(s). The model regenerated the document instead of responding conversationally.`,
  };
}
