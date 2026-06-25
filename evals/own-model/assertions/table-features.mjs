/**
 * Asserts that the output contains a table with sortable or filterable features.
 */
export default function (output) {
  const hasTable = output.includes('type: table');
  const hasSortable = output.includes('sortable: true');
  const hasFilterable = output.includes('filterable: true');

  if (hasTable && (hasSortable || hasFilterable)) {
    const features = [hasSortable && 'sortable', hasFilterable && 'filterable'].filter(Boolean);
    return { pass: true, score: 1, reason: `Table with ${features.join(' and ')} found` };
  }
  return {
    pass: false,
    score: hasTable ? 0.5 : 0,
    reason: `Expected table with sortable/filterable. ${!hasTable ? 'No table found' : 'Missing data features'}`,
  };
}
