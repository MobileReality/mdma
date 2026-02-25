/**
 * Asserts that the output contains ONLY the allowed component types (plus thinking).
 *
 * Pass allowed types via `config.allowed` as an array of strings.
 * e.g. config: { allowed: [form, button] }
 *
 * The thinking component is always implicitly allowed.
 * Fails if any component type appears that is not in the allow-list.
 */
export default function (output, { config }) {
  const allowed = new Set((config.allowed || []).map((t) => t.trim()));
  allowed.add('thinking'); // always permitted

  const blocks = [...output.matchAll(/```mdma\n([\s\S]*?)```/g)];
  if (blocks.length === 0) {
    return { pass: false, score: 0, reason: 'No MDMA blocks found' };
  }

  const found = [];
  const unexpected = [];

  for (const block of blocks) {
    const typeMatch = block[1].match(/^type:\s*(.+)$/m);
    if (!typeMatch) continue;
    const type = typeMatch[1].trim();
    found.push(type);
    if (!allowed.has(type)) {
      unexpected.push(type);
    }
  }

  if (unexpected.length === 0) {
    const nonThinking = found.filter((t) => t !== 'thinking');
    return {
      pass: true,
      score: 1,
      reason: `Only allowed components generated: ${nonThinking.join(', ')}`,
    };
  }

  return {
    pass: false,
    score: 0,
    reason: `Unexpected component(s): ${unexpected.join(', ')}. Allowed: ${[...allowed].join(', ')}. All found: ${found.join(', ')}`,
  };
}
