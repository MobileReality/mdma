/**
 * Asserts that the output contains at least one sensitive: true flag.
 */
export default function (output) {
  if (output.includes('sensitive: true')) {
    return { pass: true, score: 1, reason: 'Found sensitive: true flag' };
  }
  return { pass: false, score: 0, reason: 'Expected at least one sensitive: true flag' };
}
