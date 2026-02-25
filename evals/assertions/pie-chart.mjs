/**
 * Asserts that the output contains a pie chart variant.
 */
export default function (output) {
  if (
    output.includes('variant: pie') ||
    output.includes("variant: 'pie'") ||
    output.includes('variant: "pie"')
  ) {
    return { pass: true, score: 1, reason: 'Pie chart variant found' };
  }
  return { pass: false, score: 0, reason: 'Expected variant: pie in chart component' };
}
