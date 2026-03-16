import { describe, it, expect } from 'vitest';
import { serializeConfig } from '../../src/prompts/serialize-config.js';
import type { DomainConfig } from '../../src/prompts/types.js';

function makeDomain(overrides: Partial<DomainConfig> = {}): DomainConfig {
  return {
    name: 'test-flow',
    domain: 'testing',
    description: 'A test flow',
    businessRules: 'Some rules',
    flowSteps: [
      {
        label: 'Step 1',
        triggerMode: 'keyword',
        trigger: 'start test, begin test',
        components: [
          {
            type: 'form', enabled: true,
            form: { fields: [{ name: 'email', type: 'email', label: 'Email', required: true, sensitive: true }] },
          },
          { type: 'thinking', enabled: true },
        ],
        description: '',
      },
    ],
    ...overrides,
  };
}

describe('serializeConfig', () => {
  describe('domain fields', () => {
    it('should include flow name, domain, and description', () => {
      const result = serializeConfig(makeDomain());
      expect(result).toContain('**Flow Name:** test-flow');
      expect(result).toContain('**Domain:** testing');
      expect(result).toContain('**Description:** A test flow');
    });

    it('should show (not set) for empty domain fields', () => {
      const result = serializeConfig(makeDomain({ name: '', domain: '', description: '' }));
      expect(result).toContain('**Flow Name:** (not set)');
      expect(result).toContain('**Domain:** (not set)');
      expect(result).toContain('**Description:** (not set)');
    });

    it('should include business rules when provided', () => {
      const result = serializeConfig(makeDomain({ businessRules: 'PII must be encrypted' }));
      expect(result).toContain('**Business Rules:** PII must be encrypted');
    });

    it('should omit business rules when empty', () => {
      const result = serializeConfig(makeDomain({ businessRules: '' }));
      expect(result).not.toContain('**Business Rules:**');
    });
  });

  describe('conversation flow', () => {
    it('should serialize a single keyword step with components', () => {
      const result = serializeConfig(makeDomain());
      expect(result).toContain('**Conversation Flow:**');
      expect(result).toContain('Step 1 — Step 1');
      expect(result).toContain('Trigger: When the user says: start test, begin test');
      expect(result).toContain('- **form**');
      expect(result).toContain('- **thinking**');
    });

    it('should serialize form fields within a step', () => {
      const result = serializeConfig(makeDomain());
      expect(result).toContain('Fields:');
      expect(result).toContain('- email (email, label: "Email", required: true, sensitive: true)');
    });

    it('should serialize an immediate step', () => {
      const result = serializeConfig(makeDomain({
        flowSteps: [{
          label: 'Start', triggerMode: 'immediate', trigger: '',
          components: [{ type: 'form', enabled: true, form: { fields: [] } }],
          description: '',
        }],
      }));
      expect(result).toContain('Trigger: Immediately when the conversation starts');
    });

    it('should serialize a form-submit step', () => {
      const result = serializeConfig(makeDomain({
        flowSteps: [
          { label: 'Collect', triggerMode: 'immediate', trigger: '', components: [{ type: 'form', enabled: true, form: { fields: [] } }], description: '' },
          { label: 'Review', triggerMode: 'form-submit', trigger: '', components: [{ type: 'approval-gate', enabled: true, approvalGate: { roles: ['admin'], requiredApprovers: 1, requireReason: false } }], description: '' },
        ],
      }));
      expect(result).toContain('Step 2 — Review');
      expect(result).toContain('Trigger: After the user submits the form/component from the previous step');
      expect(result).toContain('- **approval-gate**');
      expect(result).toContain('Roles: admin');
    });

    it('should serialize a contextual step', () => {
      const contextTrigger = 'After 3 failed attempts';
      const result = serializeConfig(makeDomain({
        flowSteps: [{
          label: 'Escalate', triggerMode: 'contextual', trigger: contextTrigger,
          components: [{ type: 'form', enabled: true, form: { fields: [] } }],
          description: '',
        }],
      }));
      expect(result).toContain(`Trigger: ${contextTrigger}`);
    });

    it('should include step description when provided', () => {
      const result = serializeConfig(makeDomain({
        flowSteps: [{
          label: 'Step 1', triggerMode: 'immediate', trigger: '',
          components: [], description: 'Show the intake form',
        }],
      }));
      expect(result).toContain('Show the intake form');
    });

    it('should serialize multi-step flow with per-step components', () => {
      const result = serializeConfig(makeDomain({
        flowSteps: [
          {
            label: 'Collect info', triggerMode: 'keyword', trigger: 'start',
            components: [
              { type: 'form', enabled: true, form: { fields: [{ name: 'name', type: 'text', label: 'Name', required: true, sensitive: false }] } },
            ],
            description: '',
          },
          {
            label: 'Review', triggerMode: 'form-submit', trigger: '',
            components: [
              { type: 'approval-gate', enabled: true, approvalGate: { roles: ['admin'], requiredApprovers: 1, requireReason: false } },
              { type: 'tasklist', enabled: true, tasklist: { items: ['Check ID'] } },
            ],
            description: '',
          },
        ],
      }));
      expect(result).toContain('Step 1 — Collect info');
      expect(result).toContain('Step 2 — Review');
      expect(result).toContain('- name (text');
      expect(result).toContain('Roles: admin');
      expect(result).toContain('- Check ID');
    });

    it('should derive global component type summary', () => {
      const result = serializeConfig(makeDomain({
        flowSteps: [
          { label: 'S1', triggerMode: 'immediate', trigger: '', components: [{ type: 'form', enabled: true, form: { fields: [] } }], description: '' },
          { label: 'S2', triggerMode: 'form-submit', trigger: '', components: [{ type: 'approval-gate', enabled: true }], description: '' },
        ],
      }));
      expect(result).toContain('**All Component Types Used:**');
      expect(result).toContain('form');
      expect(result).toContain('approval-gate');
    });

    it('should handle empty flowSteps', () => {
      const result = serializeConfig(makeDomain({ flowSteps: [] }));
      expect(result).not.toContain('**Conversation Flow:**');
    });

    it('should skip disabled components', () => {
      const result = serializeConfig(makeDomain({
        flowSteps: [{
          label: 'S1', triggerMode: 'immediate', trigger: '',
          components: [
            { type: 'form', enabled: true, form: { fields: [] } },
            { type: 'button', enabled: false },
          ],
          description: '',
        }],
      }));
      expect(result).toContain('- **form**');
      expect(result).not.toContain('- **button**');
    });

    it('should serialize table columns within a step', () => {
      const result = serializeConfig(makeDomain({
        flowSteps: [{
          label: 'S1', triggerMode: 'immediate', trigger: '',
          components: [{ type: 'table', enabled: true, table: { columns: [{ key: 'name', header: 'Name' }] } }],
          description: '',
        }],
      }));
      expect(result).toContain('- **table**');
      expect(result).toContain('Columns:');
      expect(result).toContain('- name: "Name"');
    });

    it('should serialize tasklist items within a step', () => {
      const result = serializeConfig(makeDomain({
        flowSteps: [{
          label: 'S1', triggerMode: 'immediate', trigger: '',
          components: [{ type: 'tasklist', enabled: true, tasklist: { items: ['Task A', 'Task B'] } }],
          description: '',
        }],
      }));
      expect(result).toContain('- Task A');
      expect(result).toContain('- Task B');
    });
  });
});
