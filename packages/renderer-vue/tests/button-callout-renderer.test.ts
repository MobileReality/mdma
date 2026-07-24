import { describe, it, expect } from 'vitest';
import { ButtonRenderer } from '../src/components/ButtonRenderer.js';
import { CalloutRenderer } from '../src/components/CalloutRenderer.js';
import { mdma } from './helpers/doc.js';
import { mountBlock } from './helpers/mount-block.js';

describe('ButtonRenderer', () => {
  const button = (yaml: string) => mountBlock(mdma(yaml), ButtonRenderer);

  it('renders the text and the default primary variant', async () => {
    const { wrapper } = await button(`
type: button
id: go
text: "Continue"
onAction: continue
`);
    const el = wrapper.find('button');
    expect(el.text()).toBe('Continue');
    expect(el.classes()).toContain('mdma-button--primary');
    expect(el.attributes('data-component-id')).toBe('go');
  });

  it('applies the declared variant', async () => {
    const { wrapper } = await button(`
type: button
id: danger
text: "Delete"
variant: danger
onAction: delete-it
`);
    expect(wrapper.find('button').classes()).toContain('mdma-button--danger');
  });

  it('dispatches its action on click', async () => {
    const { wrapper, store } = await button(`
type: button
id: go
text: "Continue"
onAction: continue
`);
    await wrapper.find('button').trigger('click');

    const logged = store.getEventLog().entries();
    expect(logged.some((e) => e.eventType === 'action_triggered')).toBe(true);
  });
});

describe('CalloutRenderer', () => {
  const callout = (yaml: string) => mountBlock(mdma(yaml), CalloutRenderer);

  it('renders title, content and the info variant by default', async () => {
    const { wrapper } = await callout(`
type: callout
id: note
title: "Heads up"
content: "Something to know"
`);
    expect(wrapper.find('.mdma-callout-title').text()).toBe('Heads up');
    expect(wrapper.find('.mdma-callout-content').text()).toBe('Something to know');
    expect(wrapper.find('.mdma-callout').classes()).toContain('mdma-callout--info');
    expect(wrapper.find('.mdma-callout').attributes('role')).toBe('alert');
  });

  it('applies the declared variant', async () => {
    const { wrapper } = await callout(`
type: callout
id: warn
content: "Careful"
variant: warning
`);
    expect(wrapper.find('.mdma-callout').classes()).toContain('mdma-callout--warning');
  });

  it('has no dismiss control unless dismissible', async () => {
    const { wrapper } = await callout(`
type: callout
id: note
content: "Fixed"
`);
    expect(wrapper.find('.mdma-callout-dismiss').exists()).toBe(false);
  });

  it('disappears once dismissed, and records it as document state', async () => {
    const { wrapper, store } = await callout(`
type: callout
id: note
content: "Bye"
dismissible: true
`);
    await wrapper.find('.mdma-callout-dismiss').trigger('click');

    expect(store.getComponentState('note')?.values.dismissed).toBe(true);
    expect(wrapper.find('.mdma-callout').exists()).toBe(false);
  });
});
