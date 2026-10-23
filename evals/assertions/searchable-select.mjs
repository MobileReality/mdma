/**
 * Checks `searchable` on a form's select field, and that no non-select field
 * sets `searchable: true` (the case the validator warns about).
 *
 * Config:
 *   - expect: boolean — whether the select must be `searchable: true`.
 *   - field?: string — the select field to check (default: the first select).
 */
import { parse } from 'yaml';

function parseBlocks(output) {
  const blocks = [];
  for (const match of output.matchAll(/```mdma\n([\s\S]*?)```/g)) {
    try {
      const doc = parse(match[1]);
      if (doc && typeof doc === 'object') blocks.push(doc);
    } catch {
      // unparseable block is skipped
    }
  }
  return blocks;
}

export default function (output, { config } = {}) {
  const { expect, field } = config || {};
  const fields = parseBlocks(output)
    .filter((d) => d.type === 'form')
    .flatMap((d) => (Array.isArray(d.fields) ? d.fields : []));

  const misplaced = fields.filter((f) => f?.type !== 'select' && f?.searchable === true);
  if (misplaced.length) {
    return {
      pass: false,
      score: 0,
      reason: `searchable set on non-select field(s): ${misplaced.map((f) => f.name).join(', ')}`,
    };
  }

  const select = fields.find((f) => f?.type === 'select' && (!field || f.name === field));
  if (!select) {
    return { pass: false, score: 0, reason: `No select field${field ? ` "${field}"` : ''} found` };
  }

  const searchable = select.searchable === true;
  if (searchable !== expect) {
    return {
      pass: false,
      score: 0,
      reason: `select "${select.name}" searchable is ${select.searchable ?? 'unset'}, expected ${expect}`,
    };
  }
  return {
    pass: true,
    score: 1,
    reason: `select "${select.name}" is ${expect ? '' : 'not '}searchable`,
  };
}
