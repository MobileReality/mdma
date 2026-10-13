import type { DataSourceDescriptor } from '@mobile-reality/mdma-spec';

export function renderDataSourceCatalog(sources: readonly DataSourceDescriptor[]): string {
  const items = sources
    .map((source) => {
      const lines = [`- **${source.name}** (kind: ${source.kind})`];
      if (source.description) lines[0] += ` — ${source.description}`;
      if (source.columns?.length) {
        const columns = source.columns
          .map(
            (column) =>
              `${column.key}: ${column.type}${column.description ? ` (${column.description})` : ''}`,
          )
          .join(', ');
        lines.push(`  - columns: ${columns}`);
      }
      if (source.params?.length) {
        const params = source.params
          .map((param) => {
            const allowed = param.allowed?.length
              ? `, allowed: ${param.allowed.map((value) => JSON.stringify(value)).join(' | ')}`
              : '';
            return `${param.name}: ${param.type} (${param.required ? 'required' : 'optional'}${allowed})`;
          })
          .join('; ');
        lines.push(`  - params: ${params}`);
      }
      return lines.join('\n');
    })
    .join('\n');

  return `## Available data sources

The host exposes these external data sources. Data that a source provides is ALWAYS referenced with \`{ source: <name>, params: { ... } }\` — in a \`form\` select field's \`options\`, in \`table.data\`, or in \`chart.data\` — and is NEVER generated inline as rows, options, or CSV.

Sources:

${items}

Rules:
- Use only source names listed above. NEVER invent a source; if the request needs data no listed source provides, do not reference a source and do not fabricate the data — say the data is not available.
- \`table.columns[].key\` and chart \`xAxis\` / \`yAxis\` MUST be columns of the referenced source.
- Give each param only a value of its declared type, respecting \`allowed\` values, and always supply required params. A param value may be a \`{{binding}}\` to react to another component.

Example:

\`\`\`mdma
type: table
id: open-incidents
columns:
  - key: title
    header: Title
data:
  source: incidents
  params: { status: open }
\`\`\``;
}
