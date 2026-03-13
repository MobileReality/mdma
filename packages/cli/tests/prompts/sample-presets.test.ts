import { describe, it, expect } from 'vitest';
import { MASTER_PROMPT } from '../../src/prompts/master-prompt.js';
import { serializeConfig } from '../../src/prompts/serialize-config.js';
import type { DomainConfig, ComponentConfig } from '../../src/prompts/types.js';

/**
 * Sample presets are defined in the web app's source, but we replicate
 * them here to eval-test the full prompt generation pipeline
 * (master prompt + serialized config) without importing React code.
 */

interface SamplePreset {
  domain: DomainConfig;
  components: ComponentConfig[];
}

const FORM_DEFAULTS: ComponentConfig[] = [
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

function withForm(fields: ComponentConfig['form'] extends { fields: infer F } ? F : never): ComponentConfig[] {
  return FORM_DEFAULTS.map((c) =>
    c.type === 'form' ? { ...c, enabled: true, form: { fields } } : { ...c },
  );
}

const PRESETS: Record<string, SamplePreset> = {
  'kyc-verification': {
    domain: {
      name: 'kyc-verification',
      domain: 'finance',
      description: 'KYC case review flow that collects applicant identity data, runs compliance checks, and requires dual approval before account activation.',
      businessRules: 'Government ID and date of birth must be marked sensitive. Require 2 approvers with roles: compliance-officer, senior-analyst.',
      triggerMode: 'keyword',
      trigger: 'start KYC review, new customer verification, verify identity',
    },
    components: withForm([
      { name: 'full_name', type: 'text', label: 'Full Legal Name', required: true, sensitive: false },
      { name: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true, sensitive: true },
      { name: 'id_number', type: 'text', label: 'Government ID Number', required: true, sensitive: true },
      { name: 'email', type: 'email', label: 'Email Address', required: true, sensitive: true },
    ]),
  },
  'incident-triage': {
    domain: {
      name: 'incident-triage',
      domain: 'engineering',
      description: 'Production incident triage workflow that captures severity, affected services, and timeline.',
      businessRules: 'Severity P1/P2 incidents require VP-level approval.',
      triggerMode: 'keyword',
      trigger: 'incident, outage, service down, production issue',
    },
    components: withForm([
      { name: 'incident_title', type: 'text', label: 'Incident Title', required: true, sensitive: false },
      { name: 'severity', type: 'select', label: 'Severity Level', required: true, sensitive: false },
      { name: 'reporter_email', type: 'email', label: 'Reporter Email', required: true, sensitive: true },
    ]),
  },
  'patient-intake': {
    domain: {
      name: 'patient-intake',
      domain: 'healthcare',
      description: 'Patient intake and clinical assessment form.',
      businessRules: 'All patient data fields must be sensitive. HIPAA compliance required.',
      triggerMode: 'immediate',
      trigger: '',
    },
    components: withForm([
      { name: 'patient_name', type: 'text', label: 'Patient Full Name', required: true, sensitive: true },
      { name: 'ssn', type: 'text', label: 'Social Security Number', required: true, sensitive: true },
      { name: 'insurance_id', type: 'text', label: 'Insurance ID', required: true, sensitive: true },
    ]),
  },
  'customer-escalation': {
    domain: {
      name: 'customer-escalation',
      domain: 'customer-ops',
      description: 'Customer escalation workflow for high-priority support tickets.',
      businessRules: 'Customer email and phone are PII.',
      triggerMode: 'contextual',
      trigger: 'After 3 failed resolution attempts in the conversation, or when the customer expresses frustration and asks for a supervisor.',
    },
    components: withForm([
      { name: 'customer_email', type: 'email', label: 'Customer Email', required: true, sensitive: true },
      { name: 'ticket_id', type: 'text', label: 'Original Ticket ID', required: true, sensitive: false },
      { name: 'priority', type: 'select', label: 'Escalation Priority', required: true, sensitive: false },
    ]),
  },
  'vendor-onboarding': {
    domain: {
      name: 'vendor-onboarding',
      domain: 'procurement',
      description: 'New vendor onboarding flow that collects company info, tax documents, and banking details.',
      businessRules: 'Bank account number and tax ID are sensitive.',
      triggerMode: 'keyword',
      trigger: 'add new vendor, onboard supplier, register vendor',
    },
    components: withForm([
      { name: 'company_name', type: 'text', label: 'Company Legal Name', required: true, sensitive: false },
      { name: 'tax_id', type: 'text', label: 'Tax ID / EIN', required: true, sensitive: true },
      { name: 'bank_account', type: 'text', label: 'Bank Account Number', required: true, sensitive: true },
    ]),
  },
};

describe('sample preset prompt evaluation', () => {
  const presetEntries = Object.entries(PRESETS);

  describe.each(presetEntries)('preset: %s', (_name, preset) => {
    const serialized = serializeConfig(preset.domain, preset.components);
    const fullPrompt = `${MASTER_PROMPT}\n\nGenerate a custom prompt based on this configuration:\n\n${serialized}`;

    it('should produce non-empty serialized config', () => {
      expect(serialized.length).toBeGreaterThan(100);
    });

    it('should include the flow name and domain', () => {
      expect(serialized).toContain(`**Flow Name:** ${preset.domain.name}`);
      expect(serialized).toContain(`**Domain:** ${preset.domain.domain}`);
    });

    it('should include the description', () => {
      expect(serialized).toContain(preset.domain.description);
    });

    it('should include business rules', () => {
      if (preset.domain.businessRules) {
        expect(serialized).toContain(preset.domain.businessRules);
      }
    });

    it('should include trigger information', () => {
      if (preset.domain.triggerMode === 'immediate') {
        expect(serialized).toContain('Immediately when the conversation starts');
      } else if (preset.domain.triggerMode === 'keyword') {
        expect(serialized).toContain(preset.domain.trigger);
      } else if (preset.domain.triggerMode === 'contextual') {
        expect(serialized).toContain(preset.domain.trigger);
      }
    });

    it('should list all enabled form fields', () => {
      const formComp = preset.components.find((c) => c.type === 'form' && c.enabled);
      if (formComp?.form?.fields) {
        for (const field of formComp.form.fields) {
          expect(serialized).toContain(field.name);
          expect(serialized).toContain(field.label);
        }
      }
    });

    it('should preserve sensitive flags in serialization', () => {
      const formComp = preset.components.find((c) => c.type === 'form' && c.enabled);
      if (formComp?.form?.fields) {
        const sensitiveFields = formComp.form.fields.filter((f) => f.sensitive);
        for (const field of sensitiveFields) {
          expect(serialized).toContain(`${field.name} (${field.type}, label: "${field.label}", required: ${field.required}, sensitive: true)`);
        }
      }
    });

    it('should include thinking component (always enabled)', () => {
      expect(serialized).toContain('### thinking');
    });

    it('full prompt (master + config) should be under 10k chars', () => {
      expect(fullPrompt.length).toBeLessThan(10000);
    });

    it('full prompt should contain YAML enforcement', () => {
      expect(fullPrompt).toContain('YAML');
      expect(fullPrompt).toContain('never JSON');
    });
  });
});

describe('cross-preset consistency', () => {
  it('all presets should have unique flow names', () => {
    const names = Object.values(PRESETS).map((p) => p.domain.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all presets should have unique domains', () => {
    const domains = Object.values(PRESETS).map((p) => p.domain.domain);
    expect(new Set(domains).size).toBe(domains.length);
  });

  it('all presets should have at least one sensitive field', () => {
    for (const [name, preset] of Object.entries(PRESETS)) {
      const formComp = preset.components.find((c) => c.type === 'form' && c.enabled);
      const sensitiveFields = formComp?.form?.fields.filter((f) => f.sensitive) ?? [];
      expect(sensitiveFields.length, `preset "${name}" should have sensitive fields`).toBeGreaterThan(0);
    }
  });

  it('all presets should cover different trigger modes', () => {
    const modes = new Set(Object.values(PRESETS).map((p) => p.domain.triggerMode));
    expect(modes).toContain('keyword');
    expect(modes).toContain('immediate');
    expect(modes).toContain('contextual');
  });

  it('keyword presets should have non-empty trigger phrases', () => {
    for (const [name, preset] of Object.entries(PRESETS)) {
      if (preset.domain.triggerMode === 'keyword') {
        expect(preset.domain.trigger.length, `preset "${name}" keyword trigger should not be empty`).toBeGreaterThan(0);
      }
    }
  });
});
