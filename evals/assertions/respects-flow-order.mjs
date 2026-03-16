/**
 * Asserts that the generated customPrompt respects the multi-step flow order.
 * Checks that step labels/numbers appear in sequence in the output.
 *
 * config.stepLabels: string[] — ordered labels to check sequence
 * config.minSteps: number — minimum number of distinct steps expected (default: 2)
 */
export default function (output, { config }) {
  const lower = output.toLowerCase();
  const minSteps = config?.minSteps || 2;

  // Check for step numbering or sequential language
  const stepNumbers = [];
  for (let i = 1; i <= 10; i++) {
    const patterns = [
      new RegExp(`step\\s*${i}\\b`, 'i'),
      new RegExp(`phase\\s*${i}\\b`, 'i'),
      new RegExp(`\\*\\*${i}[\\.\\)]`, 'i'),
    ];
    if (patterns.some((p) => p.test(output))) {
      stepNumbers.push(i);
    }
  }

  if (stepNumbers.length < minSteps) {
    // Fall back to checking for sequential language
    const sequentialMarkers = [
      /first|initial|begin/,
      /then|next|after|subsequent|once.*submit/,
    ];
    const foundSequential = sequentialMarkers.filter((m) => m.test(lower)).length;
    if (foundSequential >= minSteps) {
      return {
        pass: true,
        score: 0.8,
        reason: `Found sequential flow language (${foundSequential} markers) but no explicit step numbers`,
      };
    }
    return {
      pass: false,
      score: stepNumbers.length / minSteps,
      reason: `Found only ${stepNumbers.length} step references, expected at least ${minSteps}`,
    };
  }

  // Check ordering is correct (step 1 before step 2, etc.)
  let inOrder = true;
  for (let i = 1; i < stepNumbers.length; i++) {
    const prevPos = output.toLowerCase().indexOf(`step ${stepNumbers[i - 1]}`);
    const currPos = output.toLowerCase().indexOf(`step ${stepNumbers[i]}`);
    if (prevPos >= 0 && currPos >= 0 && prevPos > currPos) {
      inOrder = false;
      break;
    }
  }

  // Check step labels if provided
  const stepLabels = config?.stepLabels || [];
  let labelsFound = 0;
  if (stepLabels.length > 0) {
    for (const label of stepLabels) {
      if (lower.includes(label.toLowerCase())) labelsFound++;
    }
  }

  const labelScore = stepLabels.length > 0 ? labelsFound / stepLabels.length : 1;
  const orderScore = inOrder ? 1 : 0.5;
  const score = (labelScore + orderScore) / 2;

  return {
    pass: score >= 0.5,
    score,
    reason: `Found ${stepNumbers.length} steps (${inOrder ? 'in order' : 'out of order'})${stepLabels.length > 0 ? `, ${labelsFound}/${stepLabels.length} labels matched` : ''}`,
  };
}
