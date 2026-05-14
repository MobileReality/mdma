import { describe, it, expect } from 'vitest';
import { validate } from '../../src/index.js';

const doc = (...blocks: string[]) =>
  blocks.map((b) => `\`\`\`mdma\n${b}\`\`\``).join('\n\n');

describe('single-interactive-component rule', () => {
  it('passes for a single form', () => {
    const result = validate(
      doc('type: form\nid: f\nfields:\n  - name: x\n    type: text\n    label: X\nonSubmit: done\n'),
    );
    const issues = result.issues.filter((i) => i.ruleId === 'single-interactive-component');
    expect(issues).toHaveLength(0);
  });

  it('passes for one interactive + one non-interactive', () => {
    const result = validate(
      doc(
        'type: form\nid: f\nfields:\n  - name: x\n    type: text\n    label: X\nonSubmit: c\n',
        'type: callout\nid: c\ncontent: Done\n',
      ),
    );
    const issues = result.issues.filter((i) => i.ruleId === 'single-interactive-component');
    expect(issues).toHaveLength(0);
  });

  it('warns for form + webhook in same document', () => {
    const result = validate(
      doc(
        'type: form\nid: f\nfields:\n  - name: x\n    type: text\n    label: X\nonSubmit: w\n',
        'type: webhook\nid: w\nurl: https://example.com\ntrigger: f\n',
      ),
    );
    const issues = result.issues.filter((i) => i.ruleId === 'single-interactive-component');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
  });

  it('warns for form + approval-gate in same document', () => {
    const result = validate(
      doc(
        'type: form\nid: f\nfields:\n  - name: x\n    type: text\n    label: X\nonSubmit: g\n',
        'type: approval-gate\nid: g\ntitle: Gate\n',
      ),
    );
    const issues = result.issues.filter((i) => i.ruleId === 'single-interactive-component');
    expect(issues).toHaveLength(1);
  });

  it('warns once regardless of how many interactive components are present', () => {
    const result = validate(
      doc(
        'type: form\nid: f\nfields:\n  - name: x\n    type: text\n    label: X\nonSubmit: b\n',
        'type: button\nid: b\ntext: Go\nonAction: f\n',
        'type: tasklist\nid: t\nitems:\n  - id: i1\n    text: Item\n',
      ),
    );
    const issues = result.issues.filter((i) => i.ruleId === 'single-interactive-component');
    expect(issues).toHaveLength(1);
  });
});
