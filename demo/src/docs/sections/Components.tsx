import { useState, useEffect, useRef } from 'react';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { parseMarkdown } from '../../chat/parse-markdown.js';
import { ChartRenderer } from '../../chart-components.js';

const CUSTOMIZATIONS = {
  components: { chart: ChartRenderer },
};

export interface ComponentEntry {
  type: string;
  label: string;
  description: string;
  example: string;
}

export const COMPONENTS: ComponentEntry[] = [
  {
    type: 'form',
    label: 'Form',
    description:
      'Multi-field forms with text, email, number, select, textarea, checkbox, datetime, and file fields. Supports validation, required fields, default values, and sensitive (PII) flags.',
    example: `\`\`\`mdma
type: form
id: demo-form
onSubmit: submit-demo-form
fields:
  - name: full-name
    type: text
    label: "Full Name"
    required: true
  - name: email
    type: email
    label: "Email"
    required: true
    sensitive: true
  - name: department
    type: select
    label: "Department"
    options:
      - label: "Engineering"
        value: engineering
      - label: "Design"
        value: design
      - label: "Product"
        value: product
\`\`\``,
  },
  {
    type: 'button',
    label: 'Button',
    description: 'Action buttons with primary, secondary, and danger variants.',
    example: `\`\`\`mdma
type: button
id: demo-button
text: "Confirm Action"
variant: primary
\`\`\``,
  },
  {
    type: 'tasklist',
    label: 'Tasklist',
    description: 'Interactive checkbox task items with labels.',
    example: `\`\`\`mdma
type: tasklist
id: demo-tasklist
items:
  - id: item-1
    text: "Review the pull request"
    checked: false
  - id: item-2
    text: "Run the test suite"
    checked: true
  - id: item-3
    text: "Deploy to staging"
    checked: false
\`\`\``,
  },
  {
    type: 'table',
    label: 'Table',
    description: 'Data tables with typed columns and row data.',
    example: `\`\`\`mdma
type: table
id: demo-table
columns:
  - key: name
    label: "Name"
    type: text
  - key: status
    label: "Status"
    type: text
  - key: score
    label: "Score"
    type: number
data:
  - name: "Alice"
    status: "Active"
    score: 94
  - name: "Bob"
    status: "Pending"
    score: 78
  - name: "Carol"
    status: "Active"
    score: 88
\`\`\``,
  },
  {
    type: 'chart',
    label: 'Chart',
    description:
      'Table fallback by default — renders chart data as a simple HTML table. Override with your own renderer via customizations.components.chart.',
    example: `\`\`\`mdma
type: chart
id: demo-chart
variant: bar
xAxis: month
yAxis: revenue
showGrid: true
showLegend: false
height: 220
data: |
  month,revenue
  Jan,42000
  Feb,55000
  Mar,48000
  Apr,61000
\`\`\``,
  },
  {
    type: 'callout',
    label: 'Callout',
    description:
      'Alert banners with info, warning, error, and success variants. Supports optional title and dismiss button.',
    example: `\`\`\`mdma
type: callout
id: demo-callout
variant: warning
title: "Heads up"
content: "This action cannot be undone. Please review your changes before proceeding."
dismissible: true
\`\`\``,
  },
  {
    type: 'approval-gate',
    label: 'Approval Gate',
    description: 'Approve/deny workflow gates with pending, approved, and denied states.',
    example: `\`\`\`mdma
type: approval-gate
id: demo-gate
title: "Deploy to Production"
description: "Review the changes and approve or deny the deployment."
status: pending
\`\`\``,
  },
  {
    type: 'webhook',
    label: 'Webhook',
    description: 'Webhook triggers with idle, executing, success, and error status indicators.',
    example: `\`\`\`mdma
type: webhook
id: demo-webhook
label: "Run Integration Tests"
url: "https://ci.example.com/trigger"
trigger: run-integration-tests
status: idle
\`\`\``,
  },
  {
    type: 'thinking',
    label: 'Thinking',
    description: "Collapsible thinking/reasoning blocks that show the AI's chain of thought.",
    example: `\`\`\`mdma
type: thinking
id: demo-thinking
content: "Let me analyze the request step by step. First, I need to understand the user's intent. Then I'll determine the appropriate response format and generate the right component."
\`\`\``,
  },
];

export function ComponentPreview({ entry }: { entry: ComponentEntry }) {
  const [parsed, setParsed] = useState<{ ast: MdmaRoot; store: DocumentStore } | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;
    setParsed(null);
    parseMarkdown(entry.example).then((result) => {
      if (!cancelRef.current) setParsed(result);
    });
    return () => {
      cancelRef.current = true;
    };
  }, [entry.example]);

  return (
    <>
      <div className="docs-preview-panel-header">
        <span className="docs-preview-panel-label">{entry.label}</span>
        <code className="docs-preview-panel-type">{entry.type}</code>
      </div>
      <div className="docs-preview-panel-body">
        <p className="docs-preview-panel-desc">{entry.description}</p>
        <div className="docs-preview-panel-render">
          {parsed ? (
            <MdmaDocument ast={parsed.ast} store={parsed.store} customizations={CUSTOMIZATIONS} />
          ) : (
            <span className="docs-preview-panel-loading">Loading…</span>
          )}
        </div>
      </div>
    </>
  );
}

interface ComponentsProps {
  selected: string;
  onSelect: (type: string) => void;
}

export function Components({ selected, onSelect }: ComponentsProps) {
  return (
    <>
      <h2>Components</h2>
      <p>
        9 built-in component types defined by the MDMA spec — every renderer (React, React Native)
        renders them out of the box. Click a row to preview.
      </p>

      <div className="docs-table-wrap">
        <table className="docs-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Type key</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {COMPONENTS.map((c) => (
              <tr
                key={c.type}
                className={`docs-table-row-clickable${c.type === selected ? ' docs-table-row--active' : ''}`}
                onClick={() => onSelect(c.type)}
              >
                <td>{c.label}</td>
                <td>
                  <code>{c.type}</code>
                </td>
                <td>{c.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
