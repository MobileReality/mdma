import { describe, it, expect } from 'vitest';
import { generateComplianceReport } from '../src/compliance/compliance-reporter.js';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

function createAst(components: Array<Record<string, unknown>>): MdmaRoot {
  return {
    type: 'root',
    children: components.map((c) => ({
      type: 'mdmaBlock' as const,
      rawYaml: '',
      component: c as MdmaRoot['children'][number] extends { component: infer C } ? C : never,
    })),
  };
}

describe('generateComplianceReport', () => {
  it('generates a report with all checks passing', () => {
    const ast = createAst([
      {
        id: 'form1',
        type: 'form',
        fields: [
          { name: 'email', type: 'email', label: 'Email', sensitive: true },
          { name: 'notes', type: 'text', label: 'Notes' },
        ],
      },
      {
        id: 'gate1',
        type: 'approval-gate',
        requiredApprovers: 1,
        allowedRoles: ['admin'],
      },
    ]);

    const report = generateComplianceReport(ast, 'doc-1');
    expect(report.documentId).toBe('doc-1');
    expect(report.generatedAt).toBeDefined();
    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.summary.total).toBe(report.checks.length);
    // All should pass
    expect(report.summary.failed).toBe(0);
  });

  it('warns when PII fields are not marked sensitive', () => {
    const ast = createAst([
      {
        id: 'form1',
        type: 'form',
        fields: [
          { name: 'email', type: 'email', label: 'Email' }, // no sensitive: true
        ],
      },
    ]);

    const report = generateComplianceReport(ast, 'doc-1');
    const sensitiveCheck = report.checks.find((c) => c.name === 'sensitive-fields-marked');
    expect(sensitiveCheck).toBeDefined();
    expect(sensitiveCheck?.status).toBe('warn');
  });

  it('warns when no approval gate is present', () => {
    const ast = createAst([
      {
        id: 'form1',
        type: 'form',
        fields: [{ name: 'notes', type: 'text', label: 'Notes' }],
      },
    ]);

    const report = generateComplianceReport(ast, 'doc-1');
    const gateCheck = report.checks.find((c) => c.name === 'approval-gate-present');
    expect(gateCheck).toBeDefined();
    expect(gateCheck?.status).toBe('warn');
  });

  it('detects duplicate IDs', () => {
    const ast = createAst([
      { id: 'same', type: 'button', text: 'A', onAction: 'x' },
      { id: 'same', type: 'button', text: 'B', onAction: 'y' },
    ]);

    const report = generateComplianceReport(ast, 'doc-1');
    const idCheck = report.checks.find((c) => c.name === 'unique-component-ids');
    expect(idCheck).toBeDefined();
    expect(idCheck?.status).toBe('fail');
  });

  it('warns when no form components exist', () => {
    const ast = createAst([{ id: 'btn1', type: 'button', text: 'Click', onAction: 'do' }]);

    const report = generateComplianceReport(ast, 'doc-1');
    const formCheck = report.checks.find((c) => c.name === 'has-interactive-components');
    expect(formCheck).toBeDefined();
    expect(formCheck?.status).toBe('warn');
  });

  it('handles empty document', () => {
    const ast: MdmaRoot = { type: 'root', children: [] };
    const report = generateComplianceReport(ast, 'doc-1');
    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.summary.total).toBe(report.checks.length);
  });

  it('calculates summary correctly', () => {
    const ast = createAst([
      {
        id: 'form1',
        type: 'form',
        fields: [{ name: 'email', type: 'email', label: 'Email' }],
      },
    ]);

    const report = generateComplianceReport(ast, 'doc-1');
    const { passed, failed, warnings, total } = report.summary;
    expect(total).toBe(report.checks.length);
    expect(passed + failed + warnings).toBe(total);
  });
});
