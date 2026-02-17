import basicForm from '../../examples/basic-form/document.md?raw';
import incidentTriage from '../../blueprints/incident-triage/document.md?raw';
import changeManagement from '../../blueprints/change-management/document.md?raw';

export interface DocumentEntry {
  label: string;
  markdown: string;
}

export const documents: Record<string, DocumentEntry> = {
  'basic-form': {
    label: 'Contact Form (Basic)',
    markdown: basicForm,
  },
  'incident-triage': {
    label: 'Incident Triage (Blueprint)',
    markdown: incidentTriage,
  },
  'change-management': {
    label: 'Change Management (Blueprint)',
    markdown: changeManagement,
  },
};
