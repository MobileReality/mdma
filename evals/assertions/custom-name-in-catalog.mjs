/**
 * Anti-hallucination guard: every `custom` block's `name` must appear in the
 * host catalog. The model must never invent a variant that was not registered.
 *
 * Required config:
 *   - catalog: string[] — the registered custom-component names.
 *
 * Vacuously passes when the output has no custom blocks (nothing to check) —
 * pair with `custom-envelope` when a custom block is expected.
 */
import { parse } from 'yaml';

function customNames(output) {
  const blocks = [...output.matchAll(/```mdma\n([\s\S]*?)```/g)];
  const names = [];
  for (const block of blocks) {
    let doc;
    try {
      doc = parse(block[1]);
    } catch {
      continue;
    }
    if (doc && doc.type === 'custom') names.push(doc.name);
  }
  return names;
}

export default function (output, { config } = {}) {
  const catalog = new Set((config?.catalog || []).map((s) => String(s).trim()));
  const names = customNames(output);

  if (names.length === 0) {
    return { pass: true, score: 1, reason: 'No custom blocks to check' };
  }

  const invented = names.filter((n) => !catalog.has(String(n).trim()));
  if (invented.length) {
    return {
      pass: false,
      score: 0,
      reason: `Invented custom name(s): ${invented.join(', ')}. Catalog: ${[...catalog].join(', ')}`,
    };
  }
  return { pass: true, score: 1, reason: `All custom names in catalog: ${names.join(', ')}` };
}
