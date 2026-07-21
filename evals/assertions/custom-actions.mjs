/**
 * Asserts a `custom` block's `actions` map is well-formed and only wires events
 * the variant declares.
 *
 * Config:
 *   - events: string[] — event names the variant emits (e.g. ["onCapture"]).
 *   - require: boolean  — when true, at least one of `events` must be wired.
 *
 * Every `actions` key must be in `events`, and every value must be a non-empty
 * action-label string. Vacuously passes when no custom block has `actions`
 * (unless `require` is set).
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
  const events = new Set((config?.events || []).map((s) => String(s).trim()));
  const customs = customBlocks(output);

  const problems = [];
  let wired = 0;

  for (const c of customs) {
    if (c.actions === undefined) continue;
    if (typeof c.actions !== 'object' || Array.isArray(c.actions)) {
      problems.push(`custom block (id=${c.id ?? '?'}) \`actions\` must be a mapping`);
      continue;
    }
    for (const [key, value] of Object.entries(c.actions)) {
      wired++;
      if (events.size && !events.has(key)) {
        problems.push(`unknown action event "${key}" (allowed: ${[...events].join(', ')})`);
      }
      if (typeof value !== 'string' || value.trim() === '') {
        problems.push(`action "${key}" must map to a non-empty label`);
      }
    }
  }

  if (config?.require && wired === 0) {
    problems.push(`expected at least one action wired from: ${[...events].join(', ')}`);
  }

  if (problems.length) {
    return { pass: false, score: 0, reason: problems.join('; ') };
  }
  return {
    pass: true,
    score: 1,
    reason: wired ? `Valid action wiring (${wired} event(s))` : 'No actions to validate',
  };
}
