import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { MdmaDocument } from '../src/components/MdmaDocument.js';
import { mdma, parseAst, parseDoc } from './helpers/doc.js';

/** The document as it looks once fully streamed. */
const FULL = `# Patient Intake

Please confirm your details.

${mdma(`
type: form
id: intake
label: "Intake"
fields:
  - name: name
    type: text
    label: "Full Name"
  - name: ssn
    type: text
    label: "SSN"
    sensitive: true
onSubmit: submit-intake
`)}
${mdma(`
type: approval-gate
id: gate
title: "Clinician sign-off"
`)}`;

/** The same document mid-stream: heading, then a half-arrived form fence. */
const PARTIAL = `# Patient Intake

Please confirm your details.

\`\`\`mdma
type: form
id: intake
`;

describe('document lifecycle', () => {
  it('carries a user edit across a streamed re-parse', async () => {
    const { ast, store } = await parseDoc(FULL);
    const wrapper = mount(MdmaDocument, { props: { ast, store } });

    await wrapper.find('#intake-name').setValue('Ada Lovelace');
    expect(store.getComponentState('intake')?.values.name).toBe('Ada Lovelace');

    // A later chunk arrives and the document is re-parsed in place, as the
    // AG-UI bridge does. The typed value must survive.
    const nextAst = await parseAst(`${FULL}\n\nThanks!\n`);
    store.updateAst(nextAst);
    await wrapper.setProps({ ast: nextAst });

    expect(store.getComponentState('intake')?.values.name).toBe('Ada Lovelace');
    expect((wrapper.find('#intake-name').element as HTMLInputElement).value).toBe('Ada Lovelace');
    expect(wrapper.text()).toContain('Thanks!');
  });

  it('replaces the skeleton with the real block once the fence closes', async () => {
    const partialAst = await parseAst(PARTIAL);
    const { store } = await parseDoc(PARTIAL);
    const wrapper = mount(MdmaDocument, { props: { ast: partialAst, store } });

    expect(wrapper.find('.mdma-block-loading').exists()).toBe(true);
    expect(wrapper.find('.mdma-form').exists()).toBe(false);

    const fullAst = await parseAst(FULL);
    store.updateAst(fullAst);
    await wrapper.setProps({ ast: fullAst });

    expect(wrapper.find('.mdma-block-loading').exists()).toBe(false);
    expect(wrapper.find('.mdma-form').exists()).toBe(true);
    expect(wrapper.find('.mdma-approval-gate').exists()).toBe(true);
  });

  it('runs a whole approve-and-submit flow through one document', async () => {
    const { ast, store } = await parseDoc(FULL);
    const wrapper = mount(MdmaDocument, { props: { ast, store } });

    await wrapper.find('#intake-name').setValue('Grace Hopper');
    await wrapper.find('#intake-ssn').setValue('123-45-6789');
    await wrapper.find('.mdma-form-submit').trigger('click');
    await wrapper.findAll('.mdma-approval-gate-actions button')[0].trigger('click');

    const eventTypes = store
      .getEventLog()
      .entries()
      .map((e) => e.eventType);
    expect(eventTypes).toContain('field_changed');
    expect(eventTypes).toContain('action_triggered');
    expect(eventTypes).toContain('approval_granted');

    // The gate has moved on and no longer offers a decision.
    expect(wrapper.find('.mdma-approval-gate-actions').exists()).toBe(false);
  });

  it('never writes a sensitive value into the audit log in the clear', async () => {
    const { ast, store } = await parseDoc(FULL);
    const wrapper = mount(MdmaDocument, { props: { ast, store } });

    await wrapper.find('#intake-name').setValue('Ada Lovelace');
    await wrapper.find('#intake-ssn').setValue('123-45-6789');

    const logged = JSON.stringify(store.getEventLog().entries());
    // The non-sensitive field proves values do reach the log at all, so the
    // absence of the SSN is redaction rather than an empty payload.
    expect(logged).toContain('Ada Lovelace');
    expect(logged).not.toContain('123-45-6789');
  });

  it('swaps theme without losing document state', async () => {
    const { ast, store } = await parseDoc(FULL);
    const wrapper = mount(MdmaDocument, { props: { ast, store, theme: 'light' } });

    await wrapper.find('#intake-name').setValue('Ada');
    await wrapper.setProps({ theme: 'dark' });

    expect(wrapper.find('.mdma-document').attributes('data-theme')).toBe('dark');
    expect((wrapper.find('#intake-name').element as HTMLInputElement).value).toBe('Ada');
  });
});
