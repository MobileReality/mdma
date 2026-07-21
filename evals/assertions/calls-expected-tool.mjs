/**
 * Multi-tool assertion — verifies the model called the RIGHT tool when
 * `generate_mdma` sits alongside a host application's own tools.
 *
 * This guards the integration case: a product imports our agent system prompt
 * and registers generate_mdma next to its own tools. Our prompt must not make
 * the model hijack requests that belong to those other tools.
 *
 * Config:
 *   - expected: string | null — tool that SHOULD be called (null = no tool at all)
 *   - forbidden: string[]     — tools that must NOT be called
 */
function serialize(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return '';
  }
}

export default function (output, context) {
  try {
    const expected = context?.config?.expected ?? null;
    const forbidden = context?.config?.forbidden ?? [];

    const blob = [output, context?.response, context?.response?.output, context?.response?.raw]
      .map(serialize)
      .join('\n');

    const called = (name) => blob.includes(name);
    const problems = [];

    if (expected && !called(expected)) {
      problems.push(`expected "${expected}" to be called, but it was not`);
    }
    for (const f of forbidden) {
      if (called(f)) {
        problems.push(`"${f}" was called but must not be (belongs to another tool / no tool)`);
      }
    }

    if (problems.length) {
      return { pass: false, score: 0, reason: problems.join('; ') };
    }
    return {
      pass: true,
      score: 1,
      reason: expected
        ? `Correctly routed to "${expected}" without hijacking other tools`
        : 'Correctly called no tool',
    };
  } catch (err) {
    return {
      pass: false,
      score: 0,
      reason: `Assertion error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
