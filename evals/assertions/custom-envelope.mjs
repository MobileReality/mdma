/**
 * Asserts the output contains a well-formed `custom` component envelope.
 *
 * A valid envelope has a non-empty `name` and, when present, a `props` mapping.
 *
 * Optional config:
 *   - name: string — require at least one custom block with this exact `name`.
 *
 * Fails if no `type: custom` block is present.
 */
import { parse } from 'yaml';

function customBlocks(output) {
  const blocks = [...output.matchAll(/```mdma\n([\s\S]*?)```/g)];
  const customs = [];
  for (const block of blocks) {
    let doc;
    try {
      doc = parse(block[1]);
    } catch {
      continue;
    }
    if (doc && doc.type === 'custom') customs.push(doc);
  }
  return customs;
}

export default function (output, { config } = {}) {
  const customs = customBlocks(output);
  if (customs.length === 0) {
    return { pass: false, score: 0, reason: 'No `type: custom` block found' };
  }

  const problems = [];
  for (const c of customs) {
    const id = c.id ?? '?';
    if (typeof c.name !== 'string' || c.name.trim() === '') {
      problems.push(`custom block (id=${id}) is missing a non-empty \`name\``);
    }
    if (c.props !== undefined && (typeof c.props !== 'object' || Array.isArray(c.props))) {
      problems.push(`custom block (id=${id}) \`props\` must be a mapping`);
    }
  }

  if (config?.name && !customs.some((c) => c.name === config.name)) {
    problems.push(`expected a custom block with name "${config.name}"`);
  }

  if (problems.length) {
    return { pass: false, score: 0, reason: problems.join('; ') };
  }
  return {
    pass: true,
    score: 1,
    reason: `Valid custom envelope(s): ${customs.map((c) => c.name).join(', ')}`,
  };
}
