/**
 * Anti-hallucination guard for data sources: no table/chart `data` or select
 * `options` may reference a source outside the catalog. With
 * `config.forbidCatalogSources: true` it also fails on a ref to ANY catalog
 * source — for requests no catalog source can serve, where the right answer is
 * to say the data is unavailable rather than bend an unrelated source.
 *
 * Vacuously passes when the output holds no refs (unless forbidCatalogSources
 * is not set, in which case nothing is wrong either).
 */
import { parse } from 'yaml';
import { DATA_SOURCES } from '../data-sources.mjs';

function isRef(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && 'source' in value;
}

function collectRefs(output) {
  const refs = [];
  for (const match of output.matchAll(/```mdma\n([\s\S]*?)```/g)) {
    let doc;
    try {
      doc = parse(match[1]);
    } catch {
      continue;
    }
    if (!doc || typeof doc !== 'object') continue;
    if (isRef(doc.data)) refs.push(doc.data.source);
    for (const field of Array.isArray(doc.fields) ? doc.fields : []) {
      if (isRef(field?.options)) refs.push(field.options.source);
      else if (typeof field?.options === 'string' && !/^\{\{.+\}\}$/.test(field.options)) {
        refs.push(field.options);
      }
    }
  }
  return refs;
}

export default function (output, { config } = {}) {
  const known = new Set(DATA_SOURCES.map((s) => s.name));
  const refs = collectRefs(output);

  const invented = refs.filter((name) => !known.has(name));
  if (invented.length) {
    return {
      pass: false,
      score: 0,
      reason: `Invented data source(s): ${invented.join(', ')}. Catalog: ${[...known].join(', ')}`,
    };
  }

  if (config?.forbidCatalogSources && refs.length) {
    return {
      pass: false,
      score: 0,
      reason: `Bent unrelated catalog source(s) to a request they cannot serve: ${refs.join(', ')}`,
    };
  }

  return { pass: true, score: 1, reason: `No invented sources (${refs.length} ref(s) checked)` };
}
