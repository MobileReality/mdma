/**
 * Asserts that all ```mdma blocks in the output use YAML syntax, not JSON.
 *
 * Checks:
 * - No block starts with { or [
 * - No block contains "type": or "fields": (JSON keys)
 * - Every block starts with a YAML key: value pattern (e.g. type: form)
 */
export default function (output) {
  const blocks = [...output.matchAll(/```mdma\n([\s\S]*?)```/g)];

  if (blocks.length === 0) {
    // No mdma blocks in a generated customPrompt is acceptable
    // (the prompt might describe components without embedding code blocks)
    return { pass: true, score: 1, reason: 'No mdma blocks to check (OK for customPrompt)' };
  }

  const issues = [];

  for (let i = 0; i < blocks.length; i++) {
    const content = blocks[i][1].trim();
    const blockLabel = `block ${i + 1}`;

    if (content.startsWith('{') || content.startsWith('[')) {
      issues.push(`${blockLabel}: starts with JSON syntax`);
    }

    if (/"type"\s*:/.test(content)) {
      issues.push(`${blockLabel}: contains JSON "type": key`);
    }

    if (/"fields"\s*:/.test(content)) {
      issues.push(`${blockLabel}: contains JSON "fields": key`);
    }

    if (/"id"\s*:/.test(content)) {
      issues.push(`${blockLabel}: contains JSON "id": key`);
    }

    if (!/^[a-zA-Z_-]+:\s/.test(content)) {
      issues.push(`${blockLabel}: does not start with YAML key: value`);
    }
  }

  if (issues.length === 0) {
    return {
      pass: true,
      score: 1,
      reason: `All ${blocks.length} mdma block(s) use valid YAML syntax`,
    };
  }

  return {
    pass: false,
    score: 0,
    reason: `JSON detected in mdma blocks:\n${issues.join('\n')}`,
  };
}
