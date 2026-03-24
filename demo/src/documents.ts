import basicForm from '../../examples/basic-form/document.md?raw';
import approvalWorkflow from '../../examples/approval-workflow/document.md?raw';
import employeeOnboarding from '../../examples/employee-onboarding/document.md?raw';
import bugReport from '../../examples/bug-report/document.md?raw';
import surveyFeedback from '../../examples/survey-feedback/document.md?raw';
import orderTracking from '../../examples/order-tracking/document.md?raw';
import meetingNotes from '../../examples/meeting-notes/document.md?raw';
import salesDashboard from '../../examples/sales-dashboard/document.md?raw';
import featureRequest from '../../examples/feature-request/document.md?raw';
import incidentTriage from '../../blueprints/incident-triage/document.md?raw';
import changeManagement from '../../blueprints/change-management/document.md?raw';
import customerEscalation from '../../blueprints/customer-escalation/document.md?raw';
import clinicalOps from '../../blueprints/clinical-ops/document.md?raw';
import kycCase from '../../blueprints/kyc-case/document.md?raw';

export interface DocumentEntry {
  label: string;
  markdown: string;
}

export const documents: Record<string, DocumentEntry> = {
  // Examples — common use cases
  'basic-form': {
    label: 'Contact Form',
    markdown: basicForm,
  },
  'approval-workflow': {
    label: 'Budget Approval',
    markdown: approvalWorkflow,
  },
  'employee-onboarding': {
    label: 'Employee Onboarding',
    markdown: employeeOnboarding,
  },
  'bug-report': {
    label: 'Bug Report',
    markdown: bugReport,
  },
  'survey-feedback': {
    label: 'Customer Survey',
    markdown: surveyFeedback,
  },
  'order-tracking': {
    label: 'Order Tracking',
    markdown: orderTracking,
  },
  'meeting-notes': {
    label: 'Sprint Retrospective',
    markdown: meetingNotes,
  },
  'sales-dashboard': {
    label: 'Sales Dashboard',
    markdown: salesDashboard,
  },
  'feature-request': {
    label: 'Feature Request',
    markdown: featureRequest,
  },
  // Blueprints — industry-specific workflows
  'incident-triage': {
    label: 'Incident Triage',
    markdown: incidentTriage,
  },
  'change-management': {
    label: 'Change Management',
    markdown: changeManagement,
  },
  'customer-escalation': {
    label: 'Customer Escalation',
    markdown: customerEscalation,
  },
  'clinical-ops': {
    label: 'Clinical Procedure Approval',
    markdown: clinicalOps,
  },
  'kyc-case': {
    label: 'KYC Case Review',
    markdown: kycCase,
  },
};
