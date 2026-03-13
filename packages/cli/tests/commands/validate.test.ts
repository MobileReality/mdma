import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import { validate } from '@mobile-reality/mdma-validator';

// We test the validation logic directly since the command is a thin wrapper
describe('validate command logic', () => {
  it('should validate a correct MDMA document', () => {
    const markdown = `# Test Document

\`\`\`mdma
type: form
id: test-form
fields:
  - name: email
    type: email
    label: Email
    required: true
    sensitive: true
\`\`\`
`;
    const result = validate(markdown);
    expect(result.ok).toBe(true);
    expect(result.summary.errors).toBe(0);
  });

  it('should detect duplicate IDs', () => {
    const markdown = `# Test

\`\`\`mdma
type: form
id: my-form
fields:
  - name: name
    type: text
    label: Name
\`\`\`

\`\`\`mdma
type: button
id: my-form
text: Submit
onAction: submit
\`\`\`
`;
    const result = validate(markdown, { autoFix: false });
    const dupeIssues = result.issues.filter((i) => i.ruleId === 'duplicate-ids');
    expect(dupeIssues.length).toBeGreaterThan(0);
  });

  it('should detect missing sensitive flag on PII fields', () => {
    const markdown = `# Test

\`\`\`mdma
type: form
id: contact-form
fields:
  - name: email
    type: email
    label: Email Address
    required: true
\`\`\`
`;
    const result = validate(markdown, { autoFix: false });
    const sensitiveIssues = result.issues.filter((i) => i.ruleId === 'sensitive-flags');
    expect(sensitiveIssues.length).toBeGreaterThan(0);
  });

  it('should auto-fix issues when autoFix is true', () => {
    const markdown = `# Test

\`\`\`mdma
type: form
id: contact-form
fields:
  - name: email
    type: email
    label: Email Address
\`\`\`
`;
    const result = validate(markdown, { autoFix: true });
    expect(result.fixCount).toBeGreaterThan(0);
    expect(result.output).toContain('sensitive: true');
  });
});
