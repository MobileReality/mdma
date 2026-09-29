/**
 * External data-source catalog advertised to the model in the author suite,
 * mirroring what a real host passes to `buildSystemPrompt({ dataSources })`.
 * The data-source scenarios in tests.yaml assert against these descriptors;
 * these are the ONLY valid source names.
 */
export const DATA_SOURCES = [
  {
    name: 'incidents',
    description: 'Operational incidents raised against internal services.',
    kind: 'rows',
    columns: [
      { key: 'id', type: 'string', sensitive: false },
      { key: 'title', type: 'string', sensitive: false },
      { key: 'service', type: 'string', sensitive: false },
      { key: 'severity', type: 'string', sensitive: false },
      { key: 'status', type: 'string', sensitive: false },
      { key: 'opened_at', type: 'date', sensitive: false },
    ],
    params: [
      { name: 'status', type: 'string', required: true, allowed: ['open', 'resolved'] },
      { name: 'service', type: 'string', required: false },
    ],
  },
  {
    name: 'countries',
    description: 'ISO countries, usable as select options.',
    kind: 'options',
    params: [
      {
        name: 'region',
        type: 'string',
        required: false,
        allowed: ['europe', 'asia', 'americas', 'africa', 'oceania'],
      },
    ],
  },
  {
    name: 'sales-by-month',
    description: 'Monthly sales totals for a calendar year.',
    kind: 'series',
    columns: [
      { key: 'month', type: 'string', sensitive: false },
      { key: 'revenue', type: 'number', sensitive: false },
      { key: 'orders', type: 'number', sensitive: false },
    ],
    params: [{ name: 'year', type: 'number', required: true }],
  },
];

export function toCatalog(sources = DATA_SOURCES) {
  return Object.fromEntries(sources.map((source) => [source.name, source]));
}
