import { describe, expect, it } from 'vitest';
import { acceptRendererAuditEntries } from './audit-input.js';

const fieldChanged = {
  eventType: 'field_changed',
  componentId: 'intake-form',
  payload: { field: 'email', value: 'a@b.c' },
  redacted: false,
};

describe('acceptRendererAuditEntries', () => {
  it('accepts renderer-produced entries', () => {
    const approval = {
      eventType: 'approval_granted',
      componentId: 'gate',
      payload: {},
      redacted: false,
      actor: { id: 'reviewer-1', role: 'lead' },
    };
    expect(acceptRendererAuditEntries([fieldChanged, approval])).toEqual([fieldChanged, approval]);
  });

  it('rejects a forged integration_called entry', () => {
    const forged = {
      eventType: 'integration_called',
      componentId: 'notify',
      payload: { integrationId: 'notify-backend', result: { ok: true } },
      redacted: false,
    };
    expect(() => acceptRendererAuditEntries([fieldChanged, forged])).toThrow();
  });

  it.each([
    ['a non-array', { ...fieldChanged }],
    ['an unknown event type', [{ ...fieldChanged, eventType: 'made_up' }]],
    ['a missing componentId', [{ ...fieldChanged, componentId: undefined }]],
    ['a non-object payload', [{ ...fieldChanged, payload: 'x' }]],
    ['a malformed actor', [{ ...fieldChanged, actor: { role: 'admin' } }]],
  ])('rejects %s', (_label, input) => {
    expect(() => acceptRendererAuditEntries(input)).toThrow();
  });
});
