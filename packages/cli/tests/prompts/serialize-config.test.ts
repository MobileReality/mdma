import { describe, it, expect } from 'vitest';
import { serializeConfig } from '../../src/prompts/serialize-config.js';
import type { DomainConfig, ComponentConfig } from '../../src/prompts/types.js';

function makeDomain(overrides: Partial<DomainConfig> = {}): DomainConfig {
  return {
    name: 'test-flow',
    domain: 'testing',
    description: 'A test flow',
    businessRules: 'Some rules',
    triggerMode: 'keyword',
    trigger: 'start test, begin test',
    ...overrides,
  };
}

const DISABLED_COMPONENTS: ComponentConfig[] = [
  { type: 'form', enabled: false, form: { fields: [] } },
  { type: 'button', enabled: false },
  { type: 'tasklist', enabled: false, tasklist: { items: [] } },
  { type: 'table', enabled: false, table: { columns: [] } },
  { type: 'callout', enabled: false },
  { type: 'approval-gate', enabled: false, approvalGate: { roles: [], requiredApprovers: 1, requireReason: false } },
  { type: 'webhook', enabled: false },
  { type: 'chart', enabled: false },
  { type: 'thinking', enabled: true },
];

function withEnabled(type: string, config?: Partial<ComponentConfig>): ComponentConfig[] {
  return DISABLED_COMPONENTS.map((c) =>
    c.type === type ? { ...c, enabled: true, ...config } : { ...c },
  );
}

describe('serializeConfig', () => {
  describe('domain fields', () => {
    it('should include flow name, domain, and description', () => {
      const result = serializeConfig(makeDomain(), DISABLED_COMPONENTS);
      expect(result).toContain('**Flow Name:** test-flow');
      expect(result).toContain('**Domain:** testing');
      expect(result).toContain('**Description:** A test flow');
    });

    it('should show (not set) for empty domain fields', () => {
      const result = serializeConfig(makeDomain({ name: '', domain: '', description: '' }), DISABLED_COMPONENTS);
      expect(result).toContain('**Flow Name:** (not set)');
      expect(result).toContain('**Domain:** (not set)');
      expect(result).toContain('**Description:** (not set)');
    });

    it('should include business rules when provided', () => {
      const result = serializeConfig(makeDomain({ businessRules: 'PII must be encrypted' }), DISABLED_COMPONENTS);
      expect(result).toContain('**Business Rules:** PII must be encrypted');
    });

    it('should omit business rules when empty', () => {
      const result = serializeConfig(makeDomain({ businessRules: '' }), DISABLED_COMPONENTS);
      expect(result).not.toContain('**Business Rules:**');
    });
  });

  describe('trigger modes', () => {
    it('should serialize keyword trigger mode', () => {
      const result = serializeConfig(
        makeDomain({ triggerMode: 'keyword', trigger: 'start KYC, verify identity' }),
        DISABLED_COMPONENTS,
      );
      expect(result).toContain('**When to Display Components:**');
      expect(result).toContain('start KYC, verify identity');
      expect(result).toContain('Only generate MDMA components when triggered by these phrases');
    });

    it('should serialize immediate trigger mode', () => {
      const result = serializeConfig(
        makeDomain({ triggerMode: 'immediate', trigger: '' }),
        DISABLED_COMPONENTS,
      );
      expect(result).toContain('Immediately when the conversation starts');
      expect(result).toContain('always respond with MDMA components in the first message');
    });

    it('should serialize contextual trigger mode', () => {
      const contextTrigger = 'After 3 failed attempts, or when user asks for supervisor';
      const result = serializeConfig(
        makeDomain({ triggerMode: 'contextual', trigger: contextTrigger }),
        DISABLED_COMPONENTS,
      );
      expect(result).toContain(`**When to Display Components:** ${contextTrigger}`);
    });

    it('should not include trigger when keyword mode has empty trigger', () => {
      const result = serializeConfig(
        makeDomain({ triggerMode: 'keyword', trigger: '' }),
        DISABLED_COMPONENTS,
      );
      expect(result).not.toContain('**When to Display Components:**');
    });

    it('should not include trigger when contextual mode has empty trigger', () => {
      const result = serializeConfig(
        makeDomain({ triggerMode: 'contextual', trigger: '' }),
        DISABLED_COMPONENTS,
      );
      expect(result).not.toContain('**When to Display Components:**');
    });
  });

  describe('component serialization', () => {
    it('should only include enabled components', () => {
      const components = withEnabled('form', {
        form: {
          fields: [
            { name: 'email', type: 'email', label: 'Email', required: true, sensitive: true },
          ],
        },
      });
      const result = serializeConfig(makeDomain(), components);
      expect(result).toContain('### form');
      expect(result).toContain('### thinking');
      expect(result).not.toContain('### button');
      expect(result).not.toContain('### webhook');
    });

    it('should serialize form fields with all attributes', () => {
      const components = withEnabled('form', {
        form: {
          fields: [
            { name: 'full_name', type: 'text', label: 'Full Name', required: true, sensitive: false },
            { name: 'ssn', type: 'text', label: 'SSN', required: true, sensitive: true },
            { name: 'age', type: 'number', label: 'Age', required: false, sensitive: false },
          ],
        },
      });
      const result = serializeConfig(makeDomain(), components);
      expect(result).toContain('Fields:');
      expect(result).toContain('- full_name (text, label: "Full Name", required: true, sensitive: false)');
      expect(result).toContain('- ssn (text, label: "SSN", required: true, sensitive: true)');
      expect(result).toContain('- age (number, label: "Age", required: false, sensitive: false)');
    });

    it('should serialize approval-gate config', () => {
      const components = withEnabled('approval-gate', {
        approvalGate: {
          roles: ['compliance-officer', 'senior-analyst'],
          requiredApprovers: 2,
          requireReason: true,
        },
      });
      const result = serializeConfig(makeDomain(), components);
      expect(result).toContain('### approval-gate');
      expect(result).toContain('Roles: compliance-officer, senior-analyst');
      expect(result).toContain('Required approvers: 2');
      expect(result).toContain('Require reason on denial: true');
    });

    it('should serialize tasklist items', () => {
      const components = withEnabled('tasklist', {
        tasklist: { items: ['Verify ID', 'Check sanctions', 'Review documents'] },
      });
      const result = serializeConfig(makeDomain(), components);
      expect(result).toContain('### tasklist');
      expect(result).toContain('Items:');
      expect(result).toContain('- Verify ID');
      expect(result).toContain('- Check sanctions');
      expect(result).toContain('- Review documents');
    });

    it('should serialize table columns', () => {
      const components = withEnabled('table', {
        table: { columns: [{ key: 'name', header: 'Name' }, { key: 'status', header: 'Status' }] },
      });
      const result = serializeConfig(makeDomain(), components);
      expect(result).toContain('### table');
      expect(result).toContain('Columns:');
      expect(result).toContain('- name: "Name"');
      expect(result).toContain('- status: "Status"');
    });

    it('should handle empty form fields gracefully', () => {
      const components = withEnabled('form', { form: { fields: [] } });
      const result = serializeConfig(makeDomain(), components);
      expect(result).toContain('### form');
      expect(result).not.toContain('Fields:');
    });

    it('should handle approval-gate with no roles', () => {
      const components = withEnabled('approval-gate', {
        approvalGate: { roles: [], requiredApprovers: 1, requireReason: false },
      });
      const result = serializeConfig(makeDomain(), components);
      expect(result).toContain('Roles: (none)');
    });
  });
});
