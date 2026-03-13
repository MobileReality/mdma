import type { DomainConfig, ComponentConfig, FormFieldConfig } from '../hooks/use-prompt-builder.js';

export interface SamplePreset {
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

function withForm(fields: FormFieldConfig[]): ComponentConfig[] {
  return FORM_DEFAULTS.map((c) =>
    c.type === 'form' ? { ...c, enabled: true, form: { fields } } : { ...c },
  );
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    domain: {
      name: 'kyc-verification',
      domain: 'finance',
      description: 'KYC case review flow that collects applicant identity data, runs compliance checks, and requires dual approval before account activation.',
      businessRules: 'Government ID and date of birth must be marked sensitive. Require 2 approvers with roles: compliance-officer, senior-analyst. PEP screening and sanctions list checks are mandatory before approval.',
      triggerMode: 'keyword',
      trigger: 'start KYC review, new customer verification, verify identity',
    },
    components: withForm([
      { name: 'full_name', type: 'text', label: 'Full Legal Name', required: true, sensitive: false },
      { name: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true, sensitive: true },
      { name: 'nationality', type: 'text', label: 'Nationality', required: true, sensitive: false },
      { name: 'id_type', type: 'select', label: 'ID Document Type', required: true, sensitive: false },
      { name: 'id_number', type: 'text', label: 'Government ID Number', required: true, sensitive: true },
      { name: 'address', type: 'textarea', label: 'Residential Address', required: true, sensitive: true },
      { name: 'email', type: 'email', label: 'Email Address', required: true, sensitive: true },
      { name: 'phone', type: 'text', label: 'Phone Number', required: false, sensitive: true },
    ]),
  },
  {
    domain: {
      name: 'incident-triage',
      domain: 'engineering',
      description: 'Production incident triage workflow that captures severity, affected services, and timeline, then routes through an on-call approval gate before executing remediation steps.',
      businessRules: 'Severity P1/P2 incidents require VP-level approval. All incidents must have a root cause analysis tasklist completed within 48 hours. Slack and PagerDuty webhooks must fire on escalation.',
      triggerMode: 'keyword',
      trigger: 'incident, outage, service down, production issue',
    },
    components: withForm([
      { name: 'incident_title', type: 'text', label: 'Incident Title', required: true, sensitive: false },
      { name: 'severity', type: 'select', label: 'Severity Level', required: true, sensitive: false },
      { name: 'affected_services', type: 'textarea', label: 'Affected Services', required: true, sensitive: false },
      { name: 'start_time', type: 'date', label: 'Incident Start Time', required: true, sensitive: false },
      { name: 'reporter_email', type: 'email', label: 'Reporter Email', required: true, sensitive: true },
      { name: 'customer_impact', type: 'textarea', label: 'Customer Impact Description', required: true, sensitive: false },
      { name: 'estimated_users', type: 'number', label: 'Estimated Users Affected', required: false, sensitive: false },
    ]),
  },
  {
    domain: {
      name: 'patient-intake',
      domain: 'healthcare',
      description: 'Patient intake and clinical assessment form that gathers demographics, insurance info, medical history, and current symptoms before routing to the appropriate care team.',
      businessRules: 'All patient data fields (SSN, DOB, insurance ID, medical record number) must be sensitive. HIPAA compliance required. Physician approval gate needed before treatment plan activation. Allergies and medications are required fields.',
      triggerMode: 'immediate',
      trigger: '',
    },
    components: withForm([
      { name: 'patient_name', type: 'text', label: 'Patient Full Name', required: true, sensitive: true },
      { name: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true, sensitive: true },
      { name: 'ssn', type: 'text', label: 'Social Security Number', required: true, sensitive: true },
      { name: 'insurance_id', type: 'text', label: 'Insurance ID', required: true, sensitive: true },
      { name: 'allergies', type: 'textarea', label: 'Known Allergies', required: true, sensitive: false },
      { name: 'medications', type: 'textarea', label: 'Current Medications', required: true, sensitive: false },
      { name: 'symptoms', type: 'textarea', label: 'Current Symptoms', required: true, sensitive: false },
      { name: 'emergency_contact', type: 'text', label: 'Emergency Contact Phone', required: true, sensitive: true },
    ]),
  },
  {
    domain: {
      name: 'customer-escalation',
      domain: 'customer-ops',
      description: 'Customer escalation workflow for high-priority support tickets. Captures customer details, issue history, and sentiment, then triggers internal review and resolution tracking.',
      businessRules: 'Customer email and phone are PII. Escalations open > 24 hours require manager approval. Resolution must include a customer satisfaction follow-up task. CRM webhook fires on status change.',
      triggerMode: 'contextual',
      trigger: 'After 3 failed resolution attempts in the conversation, or when the customer expresses frustration and asks for a supervisor.',
    },
    components: withForm([
      { name: 'customer_name', type: 'text', label: 'Customer Name', required: true, sensitive: false },
      { name: 'customer_email', type: 'email', label: 'Customer Email', required: true, sensitive: true },
      { name: 'customer_phone', type: 'text', label: 'Customer Phone', required: false, sensitive: true },
      { name: 'ticket_id', type: 'text', label: 'Original Ticket ID', required: true, sensitive: false },
      { name: 'priority', type: 'select', label: 'Escalation Priority', required: true, sensitive: false },
      { name: 'issue_summary', type: 'textarea', label: 'Issue Summary', required: true, sensitive: false },
      { name: 'previous_attempts', type: 'number', label: 'Previous Resolution Attempts', required: false, sensitive: false },
    ]),
  },
  {
    domain: {
      name: 'vendor-onboarding',
      domain: 'procurement',
      description: 'New vendor onboarding flow that collects company info, tax documents, banking details, and compliance certifications before activating the vendor in the payment system.',
      businessRules: 'Bank account number and tax ID are sensitive. Require legal review approval and finance approval (2 gates). W-9 or W-8BEN verification must be completed. Contracts over $50k need VP sign-off.',
      triggerMode: 'keyword',
      trigger: 'add new vendor, onboard supplier, register vendor',
    },
    components: withForm([
      { name: 'company_name', type: 'text', label: 'Company Legal Name', required: true, sensitive: false },
      { name: 'tax_id', type: 'text', label: 'Tax ID / EIN', required: true, sensitive: true },
      { name: 'contact_email', type: 'email', label: 'Primary Contact Email', required: true, sensitive: true },
      { name: 'contact_name', type: 'text', label: 'Primary Contact Name', required: true, sensitive: false },
      { name: 'bank_account', type: 'text', label: 'Bank Account Number', required: true, sensitive: true },
      { name: 'routing_number', type: 'text', label: 'Bank Routing Number', required: true, sensitive: true },
      { name: 'contract_value', type: 'number', label: 'Annual Contract Value ($)', required: true, sensitive: false },
      { name: 'address', type: 'textarea', label: 'Business Address', required: true, sensitive: false },
    ]),
  },
];

export function pickRandomPreset(): SamplePreset {
  const index = Math.floor(Math.random() * SAMPLE_PRESETS.length);
  return SAMPLE_PRESETS[index];
}
