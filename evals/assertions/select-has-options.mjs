/**
 * Asserts that the output contains a select field with an options array.
 */
export default function (output) {
  const hasSelect = output.includes('type: select');
  const hasOptions = output.includes('options:');
  if (hasSelect && hasOptions) {
    return { pass: true, score: 1, reason: 'Select field has options' };
  }
  return {
    pass: false,
    score: 0,
    reason: `Missing ${!hasSelect ? 'type: select' : 'options array'}`,
  };
}
