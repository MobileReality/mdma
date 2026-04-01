import { describe, it, expect } from 'vitest';
import { MASTER_PROMPT } from '../../src/prompts/master-prompt.js';
import { serializeConfig } from '../../src/prompts/serialize-config.js';
import type { DomainConfig } from '../../src/prompts/types.js';

const PRESETS: Record<string, DomainConfig> = {
  'contact-form': {
    name: 'contact-form',
    domain: 'support',
    description: 'Collect contact info, then gather feedback after the issue is resolved.',
    businessRules: 'Email is sensitive.',
    flowSteps: [
      {
        label: 'Contact info',
        triggerMode: 'immediate',
        trigger: '',
        components: [
          {
            type: 'form',
            enabled: true,
            form: {
              fields: [
                { name: 'name', type: 'text', label: 'Name', required: true, sensitive: false },
                { name: 'email', type: 'email', label: 'Email', required: true, sensitive: true },
                {
                  name: 'message',
                  type: 'textarea',
                  label: 'Message',
                  required: true,
                  sensitive: false,
                },
              ],
            },
          },
        ],
        description: '',
      },
      {
        label: 'Feedback',
        triggerMode: 'form-submit',
        trigger: '',
        components: [
          {
            type: 'form',
            enabled: true,
            form: {
              fields: [
                {
                  name: 'rating',
                  type: 'select',
                  label: 'Rating',
                  required: true,
                  sensitive: false,
                },
                {
                  name: 'comments',
                  type: 'textarea',
                  label: 'Comments',
                  required: false,
                  sensitive: false,
                },
              ],
            },
          },
        ],
        description: '',
      },
    ],
  },
  'bug-report': {
    name: 'bug-report',
    domain: 'engineering',
    description: 'Report a bug, then collect repro steps.',
    businessRules: 'Reporter email is sensitive.',
    flowSteps: [
      {
        label: 'Bug details',
        triggerMode: 'keyword',
        trigger: 'bug, report bug',
        components: [
          {
            type: 'form',
            enabled: true,
            form: {
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: 'Bug Title',
                  required: true,
                  sensitive: false,
                },
                {
                  name: 'severity',
                  type: 'select',
                  label: 'Severity',
                  required: true,
                  sensitive: false,
                },
                {
                  name: 'reporter_email',
                  type: 'email',
                  label: 'Reporter Email',
                  required: true,
                  sensitive: true,
                },
              ],
            },
          },
        ],
        description: '',
      },
      {
        label: 'Repro steps',
        triggerMode: 'form-submit',
        trigger: '',
        components: [
          {
            type: 'form',
            enabled: true,
            form: {
              fields: [
                {
                  name: 'steps',
                  type: 'textarea',
                  label: 'Steps to Reproduce',
                  required: true,
                  sensitive: false,
                },
                {
                  name: 'expected',
                  type: 'textarea',
                  label: 'Expected Behavior',
                  required: true,
                  sensitive: false,
                },
                {
                  name: 'actual',
                  type: 'textarea',
                  label: 'Actual Behavior',
                  required: true,
                  sensitive: false,
                },
              ],
            },
          },
        ],
        description: '',
      },
    ],
  },
  'event-rsvp': {
    name: 'event-rsvp',
    domain: 'events',
    description: 'RSVP for an event, then collect dietary preferences.',
    businessRules: 'Phone number is sensitive.',
    flowSteps: [
      {
        label: 'RSVP',
        triggerMode: 'keyword',
        trigger: 'rsvp, register, sign up',
        components: [
          {
            type: 'form',
            enabled: true,
            form: {
              fields: [
                {
                  name: 'attendee_name',
                  type: 'text',
                  label: 'Name',
                  required: true,
                  sensitive: false,
                },
                { name: 'phone', type: 'text', label: 'Phone', required: false, sensitive: true },
                {
                  name: 'guests',
                  type: 'number',
                  label: 'Number of Guests',
                  required: true,
                  sensitive: false,
                },
              ],
            },
          },
        ],
        description: '',
      },
      {
        label: 'Preferences',
        triggerMode: 'form-submit',
        trigger: '',
        components: [
          {
            type: 'form',
            enabled: true,
            form: {
              fields: [
                {
                  name: 'dietary',
                  type: 'select',
                  label: 'Dietary Preference',
                  required: false,
                  sensitive: false,
                },
                {
                  name: 'allergies',
                  type: 'text',
                  label: 'Allergies',
                  required: false,
                  sensitive: false,
                },
              ],
            },
          },
        ],
        description: '',
      },
    ],
  },
  'leave-request': {
    name: 'leave-request',
    domain: 'hr',
    description: 'Submit a leave request, then manager adds review notes.',
    businessRules: 'No sensitive fields.',
    flowSteps: [
      {
        label: 'Request',
        triggerMode: 'immediate',
        trigger: '',
        components: [
          {
            type: 'form',
            enabled: true,
            form: {
              fields: [
                {
                  name: 'employee_name',
                  type: 'text',
                  label: 'Employee Name',
                  required: true,
                  sensitive: false,
                },
                {
                  name: 'leave_type',
                  type: 'select',
                  label: 'Leave Type',
                  required: true,
                  sensitive: false,
                },
                {
                  name: 'start_date',
                  type: 'date',
                  label: 'Start Date',
                  required: true,
                  sensitive: false,
                },
                {
                  name: 'end_date',
                  type: 'date',
                  label: 'End Date',
                  required: true,
                  sensitive: false,
                },
              ],
            },
          },
        ],
        description: '',
      },
      {
        label: 'Manager review',
        triggerMode: 'form-submit',
        trigger: '',
        components: [
          {
            type: 'form',
            enabled: true,
            form: {
              fields: [
                {
                  name: 'reviewer',
                  type: 'text',
                  label: 'Reviewer Name',
                  required: true,
                  sensitive: false,
                },
                {
                  name: 'decision',
                  type: 'select',
                  label: 'Decision',
                  required: true,
                  sensitive: false,
                },
                {
                  name: 'notes',
                  type: 'textarea',
                  label: 'Notes',
                  required: false,
                  sensitive: false,
                },
              ],
            },
          },
        ],
        description: '',
      },
    ],
  },
  'order-return': {
    name: 'order-return',
    domain: 'e-commerce',
    description: 'Request a product return, then provide shipping details.',
    businessRules: 'Address is sensitive.',
    flowSteps: [
      {
        label: 'Return request',
        triggerMode: 'keyword',
        trigger: 'return, refund, send back',
        components: [
          {
            type: 'form',
            enabled: true,
            form: {
              fields: [
                {
                  name: 'order_id',
                  type: 'text',
                  label: 'Order ID',
                  required: true,
                  sensitive: false,
                },
                {
                  name: 'reason',
                  type: 'select',
                  label: 'Return Reason',
                  required: true,
                  sensitive: false,
                },
                {
                  name: 'item_condition',
                  type: 'select',
                  label: 'Item Condition',
                  required: true,
                  sensitive: false,
                },
              ],
            },
          },
        ],
        description: '',
      },
      {
        label: 'Shipping details',
        triggerMode: 'form-submit',
        trigger: '',
        components: [
          {
            type: 'form',
            enabled: true,
            form: {
              fields: [
                {
                  name: 'return_address',
                  type: 'textarea',
                  label: 'Return Address',
                  required: true,
                  sensitive: true,
                },
                {
                  name: 'pickup_date',
                  type: 'date',
                  label: 'Preferred Pickup Date',
                  required: false,
                  sensitive: false,
                },
              ],
            },
          },
        ],
        description: '',
      },
    ],
  },
};

describe('sample preset prompt evaluation', () => {
  const presetEntries = Object.entries(PRESETS);

  describe.each(presetEntries)('preset: %s', (_name, domain) => {
    const serialized = serializeConfig(domain);
    const fullPrompt = `${MASTER_PROMPT}\n\n${serialized}`;

    it('should produce non-empty serialized config', () => {
      expect(serialized.length).toBeGreaterThan(50);
    });

    it('should include flow name and domain', () => {
      expect(serialized).toContain(`**Flow Name:** ${domain.name}`);
      expect(serialized).toContain(`**Domain:** ${domain.domain}`);
    });

    it('should have exactly 2 flow steps', () => {
      expect(serialized).toContain('Step 1');
      expect(serialized).toContain('Step 2');
    });

    it('should include step 2 as form-submit trigger', () => {
      expect(serialized).toContain(
        'After the user submits the form/component from the previous step',
      );
    });

    it('should list form fields for both steps', () => {
      for (const step of domain.flowSteps) {
        const formComp = step.components.find((c) => c.type === 'form');
        if (formComp?.form?.fields) {
          for (const field of formComp.form.fields) {
            expect(serialized).toContain(field.name);
          }
        }
      }
    });

    it('full prompt should be under 12k chars', () => {
      expect(fullPrompt.length).toBeLessThan(13000);
    });
  });
});

describe('cross-preset consistency', () => {
  it('all presets should have unique names', () => {
    const names = Object.values(PRESETS).map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all presets should have exactly 2 steps', () => {
    for (const [name, domain] of Object.entries(PRESETS)) {
      expect(domain.flowSteps.length, `${name} should have 2 steps`).toBe(2);
    }
  });

  it('all step 2s should be form-submit', () => {
    for (const [name, domain] of Object.entries(PRESETS)) {
      expect(domain.flowSteps[1].triggerMode, `${name} step 2`).toBe('form-submit');
    }
  });

  it('all presets should cover different trigger modes for step 1', () => {
    const modes = new Set(Object.values(PRESETS).map((p) => p.flowSteps[0].triggerMode));
    expect(modes).toContain('keyword');
    expect(modes).toContain('immediate');
  });
});
