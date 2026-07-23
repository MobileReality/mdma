import { describe, it, expect } from 'vitest';
import { TasklistRenderer } from '../src/components/TasklistRenderer.js';
import { ApprovalGateRenderer } from '../src/components/ApprovalGateRenderer.js';
import { mdma } from './helpers/doc.js';
import { mountBlock } from './helpers/mount-block.js';

const TASKLIST = mdma(`
type: tasklist
id: steps
label: "Onboarding"
items:
  - id: profile
    text: "Fill in your profile"
  - id: verify
    text: "Verify your email"
onComplete: onboarding-done
`);

const actionCount = (store: {
  getEventLog: () => { entries: () => ReadonlyArray<{ eventType: string }> };
}) =>
  store
    .getEventLog()
    .entries()
    .filter((e) => e.eventType === 'action_triggered').length;

describe('TasklistRenderer', () => {
  it('renders the label and one checkbox per item', async () => {
    const { wrapper } = await mountBlock(TASKLIST, TasklistRenderer);
    expect(wrapper.find('.mdma-tasklist-label').text()).toBe('Onboarding');
    expect(wrapper.findAll('.mdma-tasklist-item')).toHaveLength(2);
    expect(wrapper.text()).toContain('Verify your email');
  });

  it('records each item as it is checked', async () => {
    const { wrapper, store } = await mountBlock(TASKLIST, TasklistRenderer);
    await wrapper.findAll('input')[0].setValue(true);
    expect(store.getComponentState('steps')?.values.profile).toBe(true);
  });

  it('fires onComplete once, on the transition to all-checked', async () => {
    const { wrapper, store } = await mountBlock(TASKLIST, TasklistRenderer);
    const boxes = wrapper.findAll('input');

    await boxes[0].setValue(true);
    expect(actionCount(store)).toBe(0);

    await boxes[1].setValue(true);
    expect(actionCount(store)).toBe(1);

    // Unchecking and re-checking crosses the boundary again — but never fires
    // while the list was already complete.
    await boxes[1].setValue(false);
    expect(actionCount(store)).toBe(1);
    await boxes[1].setValue(true);
    expect(actionCount(store)).toBe(2);
  });
});

describe('ApprovalGateRenderer', () => {
  const GATE = mdma(`
type: approval-gate
id: gate
title: "Release to production"
description: "Requires a human"
`);

  it('starts pending with both actions offered', async () => {
    const { wrapper } = await mountBlock(GATE, ApprovalGateRenderer);
    expect(wrapper.find('.mdma-approval-gate').classes()).toContain('mdma-approval-gate--pending');
    expect(wrapper.find('.mdma-approval-gate-title').text()).toBe('Release to production');
    expect(wrapper.find('.mdma-approval-gate-description').text()).toBe('Requires a human');
    expect(wrapper.findAll('.mdma-approval-gate-actions button')).toHaveLength(2);
  });

  it('records an approval and withdraws the actions', async () => {
    const { wrapper, store } = await mountBlock(GATE, ApprovalGateRenderer);
    await wrapper.findAll('.mdma-approval-gate-actions button')[0].trigger('click');

    expect(
      store
        .getEventLog()
        .entries()
        .some((e) => e.eventType === 'approval_granted'),
    ).toBe(true);
    expect(wrapper.find('.mdma-approval-gate-actions').exists()).toBe(false);
    expect(wrapper.find('.mdma-approval-gate-status').text()).toContain('approved');
  });

  it('records a denial', async () => {
    const { wrapper, store } = await mountBlock(GATE, ApprovalGateRenderer);
    await wrapper.findAll('.mdma-approval-gate-actions button')[1].trigger('click');

    expect(
      store
        .getEventLog()
        .entries()
        .some((e) => e.eventType === 'approval_denied'),
    ).toBe(true);
    expect(wrapper.find('.mdma-approval-gate').classes()).toContain('mdma-approval-gate--denied');
  });
});
