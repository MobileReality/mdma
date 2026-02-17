import { describe, it, expect } from 'vitest';
import { lintSource } from '../src/lint/lint-engine.js';

describe('lintSource', () => {
  it('returns no errors for a valid document', () => {
    const source = `# Test

\`\`\`mdma
id: form1
type: form
fields:
  - name: email
    type: email
    label: Email
    required: true
\`\`\`
`;
    const result = lintSource(source, 'test.md');
    expect(result.errorCount).toBe(0);
  });

  it('reports errors for invalid MDMA blocks', () => {
    const source = `# Bad

\`\`\`mdma
id: bad
type: form
fields: []
\`\`\`
`;
    const result = lintSource(source, 'bad.md');
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it('reports unknown component types', () => {
    const source = `# Unknown

\`\`\`mdma
id: x
type: unknown-thing
\`\`\`
`;
    const result = lintSource(source, 'unknown.md');
    expect(result.diagnostics.some((d) => d.message.includes('Unknown component type'))).toBe(
      true,
    );
  });

  it('warns on unresolved bindings', () => {
    const source = `# Binding

\`\`\`mdma
id: tbl
type: table
columns:
  - key: name
    header: Name
data: "{{undefined_data}}"
\`\`\`
`;
    const result = lintSource(source, 'binding.md');
    expect(result.warningCount).toBeGreaterThan(0);
    expect(result.diagnostics.some((d) => d.rule === 'bindings-resolved')).toBe(true);
  });

  it('handles documents with no MDMA blocks', () => {
    const result = lintSource('# Just Markdown\n\nSome text.', 'plain.md');
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it('validates multi-component documents', () => {
    const source = `# Multi

\`\`\`mdma
id: form1
type: form
fields:
  - name: name
    type: text
    label: Name
\`\`\`

\`\`\`mdma
id: btn1
type: button
text: Submit
onAction: submit
\`\`\`

\`\`\`mdma
id: callout1
type: callout
content: All done!
variant: success
\`\`\`
`;
    const result = lintSource(source, 'multi.md');
    expect(result.errorCount).toBe(0);
  });
});
