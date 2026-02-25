/**
 * Asserts that the output contains a callout with the expected variant.
 * Pass the variant name via config.variant (e.g. config: { variant: warning }).
 */
export default function (output, { config }) {
  const variant = config?.variant || 'warning';
  const hasCallout = output.includes('type: callout');
  const hasVariant =
    output.includes(`variant: ${variant}`) ||
    output.includes(`variant: '${variant}'`) ||
    output.includes(`variant: "${variant}"`);

  if (hasCallout && hasVariant) {
    return { pass: true, score: 1, reason: `Callout with variant: ${variant} found` };
  }
  return {
    pass: false,
    score: hasCallout ? 0.5 : 0,
    reason: `Expected callout with variant: ${variant}. ${!hasCallout ? 'No callout found' : 'Wrong variant'}`,
  };
}
