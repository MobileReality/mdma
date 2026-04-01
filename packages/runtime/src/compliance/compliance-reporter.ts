import type { MdmaRoot, MdmaBlock } from '@mobile-reality/mdma-spec';

export interface ComplianceCheck {
  category: 'security' | 'logging' | 'schema' | 'policy' | 'redaction';
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

export interface ComplianceReport {
  documentId: string;
  generatedAt: string;
  checks: ComplianceCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export function generateComplianceReport(ast: MdmaRoot, documentId: string): ComplianceReport {
  const checks: ComplianceCheck[] = [];

  const blocks = ast.children.filter(
    (n): n is MdmaBlock =>
      typeof n === 'object' &&
      n !== null &&
      'type' in n &&
      (n as { type: string }).type === 'mdmaBlock',
  );

  // Check: All components have unique IDs
  const ids = blocks.map((b) => b.component.id);
  const uniqueIds = new Set(ids);
  checks.push({
    category: 'schema',
    name: 'unique-component-ids',
    status: ids.length === uniqueIds.size ? 'pass' : 'fail',
    message:
      ids.length === uniqueIds.size
        ? 'All component IDs are unique'
        : `Found ${ids.length - uniqueIds.size} duplicate ID(s)`,
  });

  // Check: PII fields marked sensitive
  let piiFieldsOk = true;
  const piiHintPattern = /email|phone|ssn|name|patient|customer|address/i;
  for (const block of blocks) {
    if (block.component.type === 'form') {
      const form = block.component as { fields: Array<{ name: string; sensitive?: boolean }> };
      for (const field of form.fields) {
        if (piiHintPattern.test(field.name) && !field.sensitive) {
          piiFieldsOk = false;
        }
      }
    }
  }
  checks.push({
    category: 'security',
    name: 'sensitive-fields-marked',
    status: piiFieldsOk ? 'pass' : 'warn',
    message: piiFieldsOk
      ? 'All PII-like fields have sensitive:true'
      : 'Some PII-like fields may be missing sensitive:true',
  });

  // Check: Approval gates present for high-stakes
  const hasApprovalGate = blocks.some((b) => b.component.type === 'approval-gate');
  checks.push({
    category: 'policy',
    name: 'approval-gate-present',
    status: hasApprovalGate ? 'pass' : 'warn',
    message: hasApprovalGate
      ? 'Document includes approval gate(s)'
      : 'No approval gates found - consider adding for high-stakes workflows',
  });

  // Check: At least one form component
  const hasForms = blocks.some((b) => b.component.type === 'form');
  checks.push({
    category: 'schema',
    name: 'has-interactive-components',
    status: hasForms ? 'pass' : 'warn',
    message: hasForms ? 'Document has interactive form components' : 'No form components found',
  });

  const summary = {
    total: checks.length,
    passed: checks.filter((c) => c.status === 'pass').length,
    failed: checks.filter((c) => c.status === 'fail').length,
    warnings: checks.filter((c) => c.status === 'warn').length,
  };

  return {
    documentId,
    generatedAt: new Date().toISOString(),
    checks,
    summary,
  };
}
