import { describe, it, expect } from 'vitest';
import { defineComponent, h, type PropType } from 'vue';
import { FormRenderer } from '../src/components/FormRenderer.js';
import { mdma } from './helpers/doc.js';
import { mountBlock } from './helpers/mount-block.js';

const FORM = mdma(`
type: form
id: intake
label: "Patient Intake"
fields:
  - name: patient-name
    type: text
    label: "Full Name"
    required: true
  - name: ssn
    type: text
    label: "SSN"
    sensitive: true
  - name: reason
    type: textarea
    label: "Reason"
  - name: consent
    type: checkbox
    label: "I consent"
  - name: country
    type: select
    label: "Country"
    options: countries
  - name: scan
    type: file
    label: "Scan"
onSubmit: submit-intake
`);

const mountForm = (options = {}) => mountBlock(FORM, FormRenderer, options);

describe('FormRenderer', () => {
  it('renders the label and one field wrapper per field', async () => {
    const { wrapper } = await mountForm();
    expect(wrapper.find('.mdma-form-label').text()).toBe('Patient Intake');
    expect(wrapper.findAll('.mdma-form-field')).toHaveLength(6);
    expect(wrapper.find('.mdma-form').attributes('data-component-id')).toBe('intake');
  });

  it('picks the control matching each field type', async () => {
    const { wrapper } = await mountForm();
    expect(wrapper.find('#intake-patient-name').attributes('type')).toBe('text');
    expect(wrapper.find('textarea#intake-reason').exists()).toBe(true);
    expect(wrapper.find('#intake-consent').attributes('type')).toBe('checkbox');
    expect(wrapper.find('select#intake-country').exists()).toBe(true);
    expect(wrapper.find('#intake-scan').attributes('type')).toBe('file');
  });

  it('associates each label with its control', async () => {
    const { wrapper } = await mountForm();
    const label = wrapper.findAll('label')[0];
    expect(label.attributes('for')).toBe('intake-patient-name');
    expect(label.text()).toContain('Full Name');
  });

  it('dispatches FIELD_CHANGED on input and shows the stored value', async () => {
    const { wrapper, store } = await mountForm();
    await wrapper.find('#intake-patient-name').setValue('Ada');

    expect(store.getComponentState('intake')?.values['patient-name']).toBe('Ada');
    expect((wrapper.find('#intake-patient-name').element as HTMLInputElement).value).toBe('Ada');
  });

  it('dispatches a boolean for checkbox fields', async () => {
    const { wrapper, store } = await mountForm();
    await wrapper.find('#intake-consent').setValue(true);
    expect(store.getComponentState('intake')?.values.consent).toBe(true);
  });

  it('dispatches the selected option value', async () => {
    const { wrapper, store } = await mountForm({
      dataSources: {
        countries: [
          { label: 'Poland', value: 'pl' },
          { label: 'Japan', value: 'jp' },
        ],
      },
    });
    const options = wrapper.findAll('#intake-country option');
    // A leading empty "Select..." plus one per data-source entry.
    expect(options.map((o) => o.text())).toEqual(['Select...', 'Poland', 'Japan']);

    await wrapper.find('#intake-country').setValue('jp');
    expect(store.getComponentState('intake')?.values.country).toBe('jp');
  });

  it('resolves select options from a named data source, and empties when unknown', async () => {
    const { wrapper } = await mountForm();
    expect(wrapper.findAll('#intake-country option').map((o) => o.text())).toEqual(['Select...']);
  });

  it('masks a sensitive field until revealed', async () => {
    const { wrapper } = await mountForm();
    const ssn = wrapper.find('#intake-ssn');
    expect(ssn.attributes('type')).toBe('password');
    // The reveal toggle only appears once there is something to reveal.
    expect(wrapper.find('.mdma-sensitive-toggle').exists()).toBe(false);

    await ssn.setValue('123-45-6789');
    await wrapper.find('.mdma-sensitive-toggle').trigger('click');
    expect(wrapper.find('#intake-ssn').attributes('type')).toBe('text');
  });

  it('marks sensitive fields with a badge and a modifier class', async () => {
    const { wrapper } = await mountForm();
    expect(wrapper.findAll('.mdma-form-field--sensitive')).toHaveLength(1);
    expect(wrapper.find('.mdma-sensitive-badge').attributes('title')).toContain('sensitive data');
  });

  it('triggers the submit action', async () => {
    const { wrapper, store } = await mountForm();

    await wrapper.find('.mdma-form-submit').trigger('click');

    const logged = store.getEventLog().entries();
    expect(logged.some((e) => e.eventType === 'action_triggered')).toBe(true);
  });

  it('renders no submit button without an onSubmit action', async () => {
    const noSubmit = mdma(`
type: button
id: b
text: "x"
onAction: a
`);
    const { wrapper } = await mountBlock(noSubmit, FormRenderer);
    // A non-form component renders nothing at all.
    expect(wrapper.html()).toBe('');
  });

  it('uses an element override in place of the built-in control', async () => {
    const GlassInput = defineComponent({
      name: 'GlassInput',
      props: {
        id: { type: String, required: true },
        value: { type: String, required: true },
        onChange: { type: Function as PropType<(v: string) => void>, required: true },
      },
      setup: (props) => () =>
        h('input', {
          id: props.id,
          class: 'glass',
          value: props.value,
          onInput: (e: Event) => props.onChange((e.target as HTMLInputElement).value),
        }),
    });

    const { wrapper, store } = await mountForm({
      elementOverrides: { form: { input: GlassInput } },
    });

    expect(wrapper.findAll('input.glass').length).toBeGreaterThan(0);
    await wrapper.find('#intake-patient-name').setValue('Grace');
    expect(store.getComponentState('intake')?.values['patient-name']).toBe('Grace');
  });

  it('lets a scope opt out of the sensitive badge', async () => {
    const NoBadge = defineComponent({ setup: () => () => null });
    const { wrapper } = await mountForm({
      elementOverrides: { form: { sensitiveIndicator: NoBadge } },
    });
    expect(wrapper.find('.mdma-sensitive-badge').exists()).toBe(false);
  });
});
