/**
 * The requested component must take its data from a catalog source via
 * `{ source, params }` — never inline rows/options/CSV — and the ref must be
 * valid against the catalog (known source, columns/axes from the source,
 * required + allowed params), checked by the MDMA validator's `data-source`
 * rule.
 *
 * Config:
 *   - component: 'table' | 'chart' | 'form' — which block carries the ref.
 *   - source: string — the catalog source the ref must point at.
 *   - expectParams?: Record<string, string|number|boolean> — param values the
 *     ref must carry (loose equality so `2025` and `"2025"` both match).
 */
import { parse } from 'yaml';
import { validate } from '@mobile-reality/mdma-validator';
import { toCatalog } from '../data-sources.mjs';

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
  const { component, source, expectParams } = config || {};
  const doc = parseBlocks(output).find((d) => d.type === component);
  if (!doc) return { pass: false, score: 0, reason: `No ${component} block found` };

  const found = findSlot(doc, component);
  if (!found || found.slot === undefined) {
    return { pass: false, score: 0, reason: `No ${component} data slot found` };
  }
  if (!isRef(found.slot)) {
    return {
      pass: false,
      score: 0,
      reason: `${found.label} is inline data, expected { source: ${source}, params }`,
    };
  }
  if (found.slot.source !== source) {
    return {
      pass: false,
      score: 0,
      reason: `${found.label} uses source "${found.slot.source}", expected "${source}"`,
    };
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
      reason: `Invalid data-source ref:\n${issues.map((i) => i.message).join('\n')}`,
    };
  }

  const params = found.slot.params || {};
  const wrong = Object.entries(expectParams || {}).filter(
    ([name, value]) => String(params[name]) !== String(value),
  );
  if (wrong.length) {
    return {
      pass: false,
      score: 0,
      reason: `Param mismatch: ${wrong.map(([n, v]) => `${n} expected ${v}, got ${params[n]}`).join('; ')}`,
    };
  }

  return {
    pass: true,
    score: 1,
    reason: `${found.label} references "${source}" with valid params`,
  };
}
