import type { DomainConfig } from '../hooks/use-prompt-builder.js';

export interface SamplePreset {
  domain: DomainConfig;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    domain: {
      name: 'contact-form',
      domain: 'support',
      description: 'Collect contact info, then gather feedback after the issue is resolved.',
      businessRules: 'Email is sensitive.',
      flowSteps: [
        {
          label: 'Contact info',
          triggerMode: 'immediate',
          trigger: '',
          description: '',
          components: [
            {
              type: 'form', enabled: true,
              form: { fields: [
                { name: 'name', type: 'text', label: 'Name', required: true, sensitive: false },
                { name: 'email', type: 'email', label: 'Email', required: true, sensitive: true },
                { name: 'message', type: 'textarea', label: 'Message', required: true, sensitive: false },
              ] },
            },
          ],
        },
        {
          label: 'Feedback',
          triggerMode: 'form-submit',
          trigger: '',
          description: '',
          components: [
            {
              type: 'form', enabled: true,
              form: { fields: [
                { name: 'rating', type: 'select', label: 'Rating', required: true, sensitive: false },
                { name: 'comments', type: 'textarea', label: 'Comments', required: false, sensitive: false },
              ] },
            },
          ],
        },
      ],
    },
  },
  {
    domain: {
      name: 'bug-report',
      domain: 'engineering',
      description: 'Report a bug, then collect repro steps after initial triage.',
      businessRules: 'Reporter email is sensitive.',
      flowSteps: [
        {
          label: 'Bug details',
          triggerMode: 'keyword',
          trigger: 'bug, report bug, found a bug',
          description: '',
          components: [
            {
              type: 'form', enabled: true,
              form: { fields: [
                { name: 'title', type: 'text', label: 'Bug Title', required: true, sensitive: false },
                { name: 'severity', type: 'select', label: 'Severity', required: true, sensitive: false },
                { name: 'reporter_email', type: 'email', label: 'Reporter Email', required: true, sensitive: true },
              ] },
            },
          ],
        },
        {
          label: 'Repro steps',
          triggerMode: 'form-submit',
          trigger: '',
          description: '',
          components: [
            {
              type: 'form', enabled: true,
              form: { fields: [
                { name: 'steps', type: 'textarea', label: 'Steps to Reproduce', required: true, sensitive: false },
                { name: 'expected', type: 'textarea', label: 'Expected Behavior', required: true, sensitive: false },
                { name: 'actual', type: 'textarea', label: 'Actual Behavior', required: true, sensitive: false },
              ] },
            },
          ],
        },
      ],
    },
  },
  {
    domain: {
      name: 'event-rsvp',
      domain: 'events',
      description: 'RSVP for an event, then collect dietary preferences.',
      businessRules: 'Phone number is sensitive.',
      flowSteps: [
        {
          label: 'RSVP',
          triggerMode: 'keyword',
          trigger: 'rsvp, register, sign up',
          description: '',
          components: [
            {
              type: 'form', enabled: true,
              form: { fields: [
                { name: 'attendee_name', type: 'text', label: 'Name', required: true, sensitive: false },
                { name: 'phone', type: 'text', label: 'Phone', required: false, sensitive: true },
                { name: 'guests', type: 'number', label: 'Number of Guests', required: true, sensitive: false },
              ] },
            },
          ],
        },
        {
          label: 'Preferences',
          triggerMode: 'form-submit',
          trigger: '',
          description: '',
          components: [
            {
              type: 'form', enabled: true,
              form: { fields: [
                { name: 'dietary', type: 'select', label: 'Dietary Preference', required: false, sensitive: false },
                { name: 'allergies', type: 'text', label: 'Allergies', required: false, sensitive: false },
              ] },
            },
          ],
        },
      ],
    },
  },
  {
    domain: {
      name: 'leave-request',
      domain: 'hr',
      description: 'Submit a leave request, then manager adds review notes.',
      businessRules: 'No sensitive fields.',
      flowSteps: [
        {
          label: 'Request',
          triggerMode: 'immediate',
          trigger: '',
          description: '',
          components: [
            {
              type: 'form', enabled: true,
              form: { fields: [
                { name: 'employee_name', type: 'text', label: 'Employee Name', required: true, sensitive: false },
                { name: 'leave_type', type: 'select', label: 'Leave Type', required: true, sensitive: false },
                { name: 'start_date', type: 'date', label: 'Start Date', required: true, sensitive: false },
                { name: 'end_date', type: 'date', label: 'End Date', required: true, sensitive: false },
              ] },
            },
          ],
        },
        {
          label: 'Manager review',
          triggerMode: 'form-submit',
          trigger: '',
          description: '',
          components: [
            {
              type: 'form', enabled: true,
              form: { fields: [
                { name: 'reviewer', type: 'text', label: 'Reviewer Name', required: true, sensitive: false },
                { name: 'decision', type: 'select', label: 'Decision', required: true, sensitive: false },
                { name: 'notes', type: 'textarea', label: 'Notes', required: false, sensitive: false },
              ] },
            },
          ],
        },
      ],
    },
  },
  {
    domain: {
      name: 'order-return',
      domain: 'e-commerce',
      description: 'Request a product return, then provide shipping details.',
      businessRules: 'Address is sensitive.',
      flowSteps: [
        {
          label: 'Return request',
          triggerMode: 'keyword',
          trigger: 'return, refund, send back',
          description: '',
          components: [
            {
              type: 'form', enabled: true,
              form: { fields: [
                { name: 'order_id', type: 'text', label: 'Order ID', required: true, sensitive: false },
                { name: 'reason', type: 'select', label: 'Return Reason', required: true, sensitive: false },
                { name: 'item_condition', type: 'select', label: 'Item Condition', required: true, sensitive: false },
              ] },
            },
          ],
        },
        {
          label: 'Shipping details',
          triggerMode: 'form-submit',
          trigger: '',
          description: '',
          components: [
            {
              type: 'form', enabled: true,
              form: { fields: [
                { name: 'return_address', type: 'textarea', label: 'Return Address', required: true, sensitive: true },
                { name: 'pickup_date', type: 'date', label: 'Preferred Pickup Date', required: false, sensitive: false },
              ] },
            },
          ],
        },
      ],
    },
  },
];

export function pickRandomPreset(): SamplePreset {
  const index = Math.floor(Math.random() * SAMPLE_PRESETS.length);
  return SAMPLE_PRESETS[index];
}
