import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../src/validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function fixture(name: string): string {
  return readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8');
}

describe('validate()', () => {
  it('returns ok:true for a valid document', () => {
    const md = fixture('valid-document.md');
    const result = validate(md);
    expect(result.ok).toBe(true);
    expect(result.summary.errors).toBe(0);
  });

  it('auto-fixes duplicate IDs', () => {
    const md = fixture('duplicate-ids.md');
    const result = validate(md);
    expect(result.fixCount).toBeGreaterThan(0);
    expect(result.output).toContain('notice-2');
    expect(result.output).toContain('notice-3');

    // Re-validate the fixed output
    const recheck = validate(result.output);
    const dupIssues = recheck.issues.filter(
      (i) => i.ruleId === 'duplicate-ids',
    );
    expect(dupIssues).toHaveLength(0);
  });

  it('auto-fixes PII fields missing sensitive flag', () => {
    const md = fixture('pii-missing-sensitive.md');
    const result = validate(md);

    const sensitiveIssues = result.issues.filter(
      (i) => i.ruleId === 'sensitive-flags',
    );
    expect(sensitiveIssues.length).toBeGreaterThan(0);

    // All should be auto-fixed
    const unfixedSensitive = sensitiveIssues.filter((i) => !i.fixed);
    expect(unfixedSensitive).toHaveLength(0);

    // The output should contain sensitive: true
    expect(result.output).toContain('sensitive: true');
  });

  it('auto-fixes bad ID format', () => {
    const md = fixture('bad-id-format.md');
    const result = validate(md);

    const idIssues = result.issues.filter((i) => i.ruleId === 'id-format');
    expect(idIssues.length).toBeGreaterThan(0);

    // All should be auto-fixed
    expect(idIssues.every((i) => i.fixed)).toBe(true);

    // The output should contain kebab-case IDs
    expect(result.output).toContain('my-callout');
    expect(result.output).toContain('the-table');
    expect(result.output).toContain('loud-button');

    // Action references should also be updated
    expect(result.output).toContain('onAction: my-callout');
  });

  it('flags missing thinking block', () => {
    const md = fixture('no-thinking-block.md');
    const result = validate(md);

    const thinkingIssues = result.issues.filter(
      (i) => i.ruleId === 'thinking-block',
    );
    expect(thinkingIssues).toHaveLength(1);
    expect(thinkingIssues[0].severity).toBe('warning');
  });

  it('flags bad binding syntax', () => {
    const md = fixture('bad-bindings.md');
    const result = validate(md);

    const bindingIssues = result.issues.filter(
      (i) => i.ruleId === 'binding-syntax',
    );
    expect(bindingIssues.length).toBeGreaterThan(0);
  });

  it('respects exclude option', () => {
    const md = fixture('pii-missing-sensitive.md');
    const result = validate(md, { exclude: ['sensitive-flags'] });
    const sensitiveIssues = result.issues.filter(
      (i) => i.ruleId === 'sensitive-flags',
    );
    expect(sensitiveIssues).toHaveLength(0);
  });

  it('works with autoFix: false', () => {
    const md = fixture('bad-id-format.md');
    const result = validate(md, { autoFix: false });
    expect(result.output).toBe(md);
    expect(result.fixCount).toBe(0);
    const idIssues = result.issues.filter((i) => i.ruleId === 'id-format');
    expect(idIssues.length).toBeGreaterThan(0);
    expect(idIssues.every((i) => !i.fixed)).toBe(true);
  });

  it('handles mixed issues and produces valid output after fix', () => {
    const md = fixture('mixed-issues.md');
    const result = validate(md);

    // Should have found multiple issue types
    const ruleIds = new Set(result.issues.map((i) => i.ruleId));
    expect(ruleIds.size).toBeGreaterThan(1);

    // Re-validate the fixed output — fixable errors should be gone
    const recheck = validate(result.output);
    const remainingErrors = recheck.issues.filter(
      (i) =>
        i.severity === 'error' &&
        !i.fixed &&
        // These are fixable rules
        ['duplicate-ids', 'id-format', 'sensitive-flags'].includes(i.ruleId),
    );
    expect(remainingErrors).toHaveLength(0);
  });

  it('auto-fixes table columns missing header by deriving from key', () => {
    const md = `# Table test

\`\`\`mdma
type: table
id: users-table
columns:
  - key: first_name
  - key: email
  - key: phone-number
data:
  - first_name: Alice
    email: alice@example.com
    phone-number: "555-1234"
\`\`\`
`;
    const result = validate(md);

    // Schema errors for missing header should be auto-fixed
    const schemaIssues = result.issues.filter(
      (i) => i.ruleId === 'schema-conformance' && i.componentId === 'users-table',
    );
    expect(schemaIssues.length).toBeGreaterThan(0);
    expect(schemaIssues.every((i) => i.fixed)).toBe(true);

    // Fixed output should have derived headers
    expect(result.output).toContain('First Name');
    expect(result.output).toContain('Email');
    expect(result.output).toContain('Phone Number');
  });

  it('auto-fixes form fields missing label by deriving from name', () => {
    const md = `\`\`\`mdma
type: form
id: contact-form
fields:
  - name: full_name
    type: text
  - name: email
    type: email
    label: null
  - name: phone_number
    type: text
\`\`\`
`;
    const result = validate(md);

    const schemaIssues = result.issues.filter(
      (i) => i.ruleId === 'schema-conformance' && i.componentId === 'contact-form',
    );
    expect(schemaIssues.length).toBeGreaterThan(0);
    expect(schemaIssues.every((i) => i.fixed)).toBe(true);

    expect(result.output).toContain('Full Name');
    expect(result.output).toContain('Email');
    expect(result.output).toContain('Phone Number');
  });

  it('returns empty issues for markdown with no mdma blocks', () => {
    const result = validate('# Just a heading\n\nSome text.\n');
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('auto-fixes YAML with --- document separators', () => {
    const md = `\`\`\`mdma
type: callout
id: my-callout
variant: info
title: Hello
content: This is a test
---
\`\`\`
`;
    const result = validate(md);

    // Should have parsed successfully after stripping ---
    const yamlIssues = result.issues.filter(
      (i) => i.ruleId === 'yaml-correctness',
    );
    expect(yamlIssues.length).toBe(1);
    expect(yamlIssues[0].fixed).toBe(true);
    expect(yamlIssues[0].message).toContain('separator');

    // Output should contain valid callout without ---
    expect(result.output).toContain('my-callout');
    expect(result.output).not.toMatch(/^---\s*$/m);
  });

  it('auto-fixes callout with empty content by deriving from title', () => {
    const md = `\`\`\`mdma
type: callout
id: step-complete
variant: success
title: Step 1 Complete
content: ""
\`\`\`
`;
    const result = validate(md);

    const schemaIssues = result.issues.filter(
      (i) => i.ruleId === 'schema-conformance' && i.componentId === 'step-complete',
    );
    expect(schemaIssues.length).toBeGreaterThan(0);
    expect(schemaIssues.every((i) => i.fixed)).toBe(true);

    // Content should be derived from title
    expect(result.output).toContain('Step 1 Complete');
  });

  it('auto-fixes callout with missing content by deriving from id', () => {
    const md = `\`\`\`mdma
type: callout
id: order-confirmed
variant: info
\`\`\`
`;
    const result = validate(md);

    const schemaIssues = result.issues.filter(
      (i) => i.ruleId === 'schema-conformance' && i.componentId === 'order-confirmed',
    );
    expect(schemaIssues.length).toBeGreaterThan(0);
    expect(schemaIssues.every((i) => i.fixed)).toBe(true);

    // Content should be derived from id
    expect(result.output).toContain('Order Confirmed');
  });

  it('auto-fixes table data as bare binding path by wrapping in {{ }}', () => {
    const md = `\`\`\`mdma
type: table
id: order-summary
columns:
  - key: field
    header: Field
  - key: value
    header: Value
data: personal-info.rows
\`\`\`
`;
    const result = validate(md);

    const schemaIssues = result.issues.filter(
      (i) => i.ruleId === 'schema-conformance' && i.componentId === 'order-summary',
    );
    expect(schemaIssues.length).toBeGreaterThan(0);
    expect(schemaIssues.every((i) => i.fixed)).toBe(true);

    // Data should be wrapped in {{ }}
    expect(result.output).toContain('{{personal-info.rows}}');
  });

  it('auto-splits multi-component mdma blocks into separate blocks', () => {
    const md = `# Test

\`\`\`mdma
type: callout
id: step-info
variant: info
content: "Please fill in your details."

type: form
id: my-form
fields:
  - name: email
    type: email
    label: Email
onSubmit: step-info
\`\`\`
`;
    const result = validate(md);

    // Should have split into two components
    const yamlIssues = result.issues.filter(
      (i) => i.ruleId === 'yaml-correctness',
    );
    const splitIssues = yamlIssues.filter((i) => i.message.includes('split'));
    expect(splitIssues.length).toBe(2);
    expect(splitIssues.every((i) => i.fixed)).toBe(true);

    // Output should have two separate fenced blocks
    const blockCount = (result.output.match(/```mdma/g) ?? []).length;
    expect(blockCount).toBe(2);

    // Both components should be present
    expect(result.output).toContain('step-info');
    expect(result.output).toContain('my-form');
  });
});
