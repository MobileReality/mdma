/**
 * Asserts that all component IDs are unique and follow kebab-case.
 */
export default function (output) {
  const idMatches = [...output.matchAll(/^id:\s*(.+)$/gm)];
  const ids = idMatches.map((m) => m[1].trim());

  if (ids.length < 3) {
    return { pass: false, score: 0, reason: `Expected at least 3 component IDs, found ${ids.length}` };
  }

  const unique = new Set(ids).size === ids.length;
  if (!unique) {
    return { pass: false, score: 0, reason: `Duplicate IDs found: ${ids.join(', ')}` };
  }

  const kebab = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  const nonKebab = ids.filter((id) => !kebab.test(id));
  if (nonKebab.length > 0) {
    return { pass: false, score: 0, reason: `Non-kebab-case IDs: ${nonKebab.join(', ')}` };
  }

  return { pass: true, score: 1, reason: `${ids.length} unique kebab-case IDs` };
}
