import { describe, it, expect } from 'vitest';
import {
  MdmaComponentSchema,
  FormComponentSchema,
  ButtonComponentSchema,
  TasklistComponentSchema,
  TableComponentSchema,
  CalloutComponentSchema,
  ApprovalGateComponentSchema,
  WebhookComponentSchema,
  EventLogEntrySchema,
  PolicySchema,
  BlueprintManifestSchema,
  BindingExpressionSchema,
  componentSchemaRegistry,
  COMPONENT_TYPES,
} from '../src/index.js';

describe('BindingExpressionSchema', () => {
  it('accepts valid bindings', () => {
    expect(BindingExpressionSchema.parse('{{name}}')).toBe('{{name}}');
    expect(BindingExpressionSchema.parse('{{user.name}}')).toBe('{{user.name}}');
    expect(BindingExpressionSchema.parse('{{a_b}}')).toBe('{{a_b}}');
    // Expressions with operators, negation, and spaces
    expect(BindingExpressionSchema.parse('{{!foo.bar}}')).toBe('{{!foo.bar}}');
    expect(BindingExpressionSchema.parse('{{foo || bar}}')).toBe('{{foo || bar}}');
    expect(BindingExpressionSchema.parse('{{ name }}')).toBe('{{ name }}');
  });

  it('rejects invalid bindings', () => {
    expect(() => BindingExpressionSchema.parse('name')).toThrow();
    expect(() => BindingExpressionSchema.parse('{name}')).toThrow();
    expect(() => BindingExpressionSchema.parse('{{}}')).toThrow();
    expect(() => BindingExpressionSchema.parse('')).toThrow();
  });
});

describe('FormComponentSchema', () => {
  it('validates a complete form', () => {
    const form = {
      id: 'my-form',
      type: 'form',
      fields: [
        { name: 'email', type: 'email', label: 'Email', required: true, sensitive: true },
        {
          name: 'severity',
          type: 'select',
          label: 'Severity',
          options: [
            { label: 'High', value: 'high' },
            { label: 'Low', value: 'low' },
          ],
        },
      ],
      onSubmit: 'submit-form',
    };
    const result = FormComponentSchema.parse(form);
    expect(result.id).toBe('my-form');
    expect(result.type).toBe('form');
    expect(result.fields).toHaveLength(2);
    expect(result.sensitive).toBe(false);
  });

  it('rejects form with no fields', () => {
    expect(() =>
      FormComponentSchema.parse({ id: 'f', type: 'form', fields: [] }),
    ).toThrow();
  });

  it('rejects form with missing id', () => {
    expect(() =>
      FormComponentSchema.parse({
        type: 'form',
        fields: [{ name: 'x', type: 'text', label: 'X' }],
      }),
    ).toThrow();
  });
});

describe('ButtonComponentSchema', () => {
  it('validates a button', () => {
    const button = { id: 'btn', type: 'button', text: 'Click me', onAction: 'do-thing' };
    const result = ButtonComponentSchema.parse(button);
    expect(result.variant).toBe('primary');
  });

  it('validates button with confirmation', () => {
    const button = {
      id: 'btn',
      type: 'button',
      text: 'Delete',
      variant: 'danger',
      onAction: 'delete',
      confirm: { title: 'Sure?', message: 'This is permanent' },
    };
    const result = ButtonComponentSchema.parse(button);
    expect(result.confirm?.confirmText).toBe('Confirm');
  });
});

describe('TasklistComponentSchema', () => {
  it('validates a tasklist', () => {
    const tasklist = {
      id: 'tl',
      type: 'tasklist',
      items: [
        { id: 'item1', text: 'Do thing' },
        { id: 'item2', text: 'Do other thing', required: true },
      ],
    };
    const result = TasklistComponentSchema.parse(tasklist);
    expect(result.items[0].checked).toBe(false);
  });
});

describe('TableComponentSchema', () => {
  it('validates a table with inline data', () => {
    const table = {
      id: 'tbl',
      type: 'table',
      columns: [{ key: 'name', header: 'Name' }],
      data: [{ name: 'Alice' }],
    };
    const result = TableComponentSchema.parse(table);
    expect(result.sortable).toBe(false);
  });

  it('validates a table with binding data', () => {
    const table = {
      id: 'tbl',
      type: 'table',
      columns: [{ key: 'name', header: 'Name' }],
      data: '{{items}}',
    };
    const result = TableComponentSchema.parse(table);
    expect(result.data).toBe('{{items}}');
  });
});

describe('CalloutComponentSchema', () => {
  it('validates a callout', () => {
    const callout = { id: 'c', type: 'callout', content: 'Warning message', variant: 'warning' };
    const result = CalloutComponentSchema.parse(callout);
    expect(result.dismissible).toBe(false);
  });
});

describe('ApprovalGateComponentSchema', () => {
  it('validates an approval gate', () => {
    const gate = {
      id: 'gate',
      type: 'approval-gate',
      title: 'Manager Approval',
      requiredApprovers: 2,
      allowedRoles: ['manager', 'director'],
      requireReason: true,
    };
    const result = ApprovalGateComponentSchema.parse(gate);
    expect(result.requiredApprovers).toBe(2);
  });
});

describe('WebhookComponentSchema', () => {
  it('validates a webhook', () => {
    const webhook = {
      id: 'wh',
      type: 'webhook',
      url: 'https://api.example.com/notify',
      method: 'POST',
      trigger: 'submit-form',
      body: { message: '{{summary}}' },
    };
    const result = WebhookComponentSchema.parse(webhook);
    expect(result.retries).toBe(0);
    expect(result.timeout).toBe(30000);
  });

  it('validates webhook with binding URL', () => {
    const webhook = {
      id: 'wh',
      type: 'webhook',
      url: '{{webhook_url}}',
      trigger: 'notify',
    };
    const result = WebhookComponentSchema.parse(webhook);
    expect(result.method).toBe('POST');
  });
});

describe('MdmaComponentSchema (discriminated union)', () => {
  it('correctly discriminates by type', () => {
    const form = MdmaComponentSchema.parse({
      id: 'f',
      type: 'form',
      fields: [{ name: 'x', type: 'text', label: 'X' }],
    });
    expect(form.type).toBe('form');

    const button = MdmaComponentSchema.parse({
      id: 'b',
      type: 'button',
      text: 'Go',
      onAction: 'go',
    });
    expect(button.type).toBe('button');
  });

  it('rejects unknown component type', () => {
    expect(() =>
      MdmaComponentSchema.parse({ id: 'x', type: 'unknown-widget' }),
    ).toThrow();
  });
});

describe('EventLogEntrySchema', () => {
  it('validates a complete event log entry', () => {
    const entry = {
      timestamp: '2024-01-01T00:00:00.000Z',
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      documentId: 'doc-1',
      eventType: 'field_changed',
      componentId: 'my-form',
      payload: { field: 'email', oldValue: '', newValue: 'test@example.com' },
      actor: { id: 'user-1', role: 'operator' },
    };
    const result = EventLogEntrySchema.parse(entry);
    expect(result.redacted).toBe(false);
  });
});

describe('PolicySchema', () => {
  it('validates a policy', () => {
    const policy = {
      version: 1 as const,
      rules: [
        { action: 'send_email', environments: ['preview'], effect: 'deny' as const, reason: 'Blocked in preview' },
        { action: 'webhook_call', environments: ['production'], effect: 'allow' as const },
      ],
      defaultEffect: 'deny' as const,
    };
    const result = PolicySchema.parse(policy);
    expect(result.rules).toHaveLength(2);
  });
});

describe('BlueprintManifestSchema', () => {
  it('validates a manifest', () => {
    const manifest = {
      name: 'incident-triage',
      version: '0.1.0',
      maturity: 'experimental' as const,
      description: 'Incident triage document',
      outcome: 'Fully documented incident',
      domain: 'critical-ops',
      components_used: ['form', 'tasklist', 'approval-gate'],
    };
    const result = BlueprintManifestSchema.parse(manifest);
    expect(result.maturity).toBe('experimental');
  });
});

describe('componentSchemaRegistry', () => {
  it('has all component types registered', () => {
    for (const type of COMPONENT_TYPES) {
      expect(componentSchemaRegistry.has(type)).toBe(true);
    }
  });

  it('has exactly the right number of entries', () => {
    expect(componentSchemaRegistry.size).toBe(COMPONENT_TYPES.length);
  });
});
