/**
 * Asserts that the output contains a bar chart variant.
 */
export default function (output) {
  if (output.includes('variant: bar') || output.includes("variant: 'bar'") || output.includes('"bar"')) {
    return { pass: true, score: 1, reason: 'Bar chart variant found' };
  }
  return { pass: false, score: 0, reason: 'Expected variant: bar in chart component' };
}
