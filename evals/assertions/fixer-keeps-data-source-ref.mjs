/**
 * After the fixer runs, the component must still take its data from a catalog
 * source via `{ source, params }`, with no inline rows/options/CSV, and the
 * ref must pass the validator's `data-source` rule against the catalog.
 *
 * Config:
 *   - component: 'table' | 'chart' | 'form' — which block carries the ref.
 *   - source?: string — the catalog source the repaired ref must point at.
 */
import { parse } from 'yaml';
import { validate } from '@mobile-reality/mdma-validator';
import { DATA_SOURCES, toCatalog } from '../data-sources.mjs';

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

function isRef(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && 'source' in value;
}

function findSlot(doc, component) {
  if (component === 'form') {
    const select = (doc.fields || []).find((f) => f?.type === 'select');
    return select ? { slot: select.options, label: `select "${select.name}" options` } : null;
  }
  return { slot: doc.data, label: `${component}.data` };
}

export default function (output, { config } = {}) {
  const { component, source } = config || {};
  const doc = parseBlocks(output).find((d) => d.type === component);
  if (!doc) return { pass: false, score: 0, reason: `No ${component} block found` };

  const found = findSlot(doc, component);
  if (!found || !isRef(found.slot)) {
    return {
      pass: false,
      score: 0,
      reason: `${found?.label ?? `${component} data`} is not a { source, params } ref (inline data or missing)`,
    };
  }

  const known = DATA_SOURCES.map((s) => s.name);
  if (!known.includes(found.slot.source)) {
    return {
      pass: false,
      score: 0,
      reason: `${found.label} uses source "${found.slot.source}", not in catalog: ${known.join(', ')}`,
    };
  }
  if (source && found.slot.source !== source) {
    return {
      pass: false,
      score: 0,
      reason: `${found.label} uses source "${found.slot.source}", expected "${source}"`,
    };
  }
  if (component !== 'form' && Array.isArray(doc.rows)) {
    return { pass: false, score: 0, reason: `${component} also carries inline rows` };
  }

  const result = validate(output, {
    exclude: ['thinking-block', 'flow-ordering'],
    autoFix: false,
    dataSourceCatalog: toCatalog(),
  });
  const issues = result.issues.filter((i) => i.ruleId === 'data-source' && i.severity === 'error');
  if (issues.length) {
    return {
      pass: false,
      score: 0,
      reason: `Ref still invalid:\n${issues.map((i) => i.message).join('\n')}`,
    };
  }

  return {
    pass: true,
    score: 1,
    reason: `${found.label} repaired to catalog source "${found.slot.source}"`,
  };
}
