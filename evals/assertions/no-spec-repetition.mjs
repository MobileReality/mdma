/**
 * Asserts that the generated customPrompt does NOT repeat the full MDMA spec.
 *
 * A customPrompt should layer domain-specific instructions on top of the spec,
 * not duplicate it. Checks for spec-level content that should not appear.
 */
export default function (output) {
  const specMarkers = [
    { pattern: 'MDMA_AUTHOR_PROMPT', label: 'MDMA_AUTHOR_PROMPT reference' },
    { pattern: '## Self-Check Checklist', label: 'Self-check checklist' },
    { pattern: 'Component Reference Table', label: 'Component reference table' },
    { pattern: 'MUST be inside a fenced code block tagged', label: 'Base authoring rule' },
  ];

  const found = [];
  for (const marker of specMarkers) {
    if (output.includes(marker.pattern)) {
      found.push(marker.label);
    }
  }

  if (found.length === 0) {
    return {
      pass: true,
      score: 1,
      reason: 'No MDMA spec content repeated',
    };
  }

  return {
    pass: false,
    score: 0,
    reason: `CustomPrompt repeats MDMA spec content: ${found.join(', ')}`,
  };
}
