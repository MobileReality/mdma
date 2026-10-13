const INCIDENT_COLUMNS = `columns:
  - key: id
    header: ID
    sortable: true
    width: 80px
  - key: service
    header: Service
    sortable: true
  - key: severity
    header: Severity
    sortable: true
  - key: title
    header: Title
  - key: opened
    header: Opened
    sortable: true`;

export interface Scenario {
  id: string;
  title: string;
  hint: string;
  markdown: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'table',
    title: 'Table',
    hint: 'Server-side paging, sorting and a service filter bound to the select.',
    markdown: `# Incidents

\`\`\`mdma
id: filters
type: form
fields:
  - name: service
    type: select
    label: Service
    options: services
    defaultValue: all
onSubmit: apply-filters
\`\`\`

\`\`\`mdma
id: incidents
type: table
label: Incidents
sortable: true
pageSize: 10
${INCIDENT_COLUMNS}
data:
  source: incidents
  params:
    service: "{{filters.service}}"
\`\`\`
`,
  },
  {
    id: 'error',
    title: 'Error + retry',
    hint: 'The first call fails on purpose. Retry succeeds.',
    markdown: `# Forced error

\`\`\`mdma
id: flaky-incidents
type: table
label: Incidents
pageSize: 10
${INCIDENT_COLUMNS}
data:
  source: flaky
\`\`\`
`,
  },
  {
    id: 'empty',
    title: 'Empty',
    hint: 'The resolver returns zero rows.',
    markdown: `# Empty result

\`\`\`mdma
id: empty-incidents
type: table
label: Incidents
pageSize: 10
${INCIDENT_COLUMNS}
data:
  source: empty
\`\`\`
`,
  },
  {
    id: 'chart',
    title: 'Chart',
    hint: 'A chart fed by a source instead of CSV.',
    markdown: `# Sales

\`\`\`mdma
id: sales-chart
type: chart
variant: line
label: Revenue vs target (k$)
xAxis: month
data:
  source: sales
\`\`\`
`,
  },
];
