import { describe, expect, it } from 'vitest';
import { FormRenderer } from '../src/components/FormRenderer.js';
import type { FormInputElementProps } from '../src/components/form/element-props.js';
import type { ElementInstance, ElementRenderer } from '../src/context/render-context.js';
import { el } from '../src/dom/el.js';
import { mdma } from './helpers/doc.js';
import { mountBlockFor } from './helpers/mount.js';

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

const mountForm = (context = {}) => mountBlockFor(FORM, FormRenderer, context);

describe('FormRenderer', () => {
  it('renders the label and one wrapper per field', async () => {
    const { instance } = await mountForm();
    expect(instance.el.querySelector('.mdma-form-label')?.textContent).toBe('Patient Intake');
    expect(instance.el.querySelectorAll('.mdma-form-field')).toHaveLength(6);
    expect(instance.el.getAttribute('data-component-id')).toBe('intake');
  });

  it('picks the control matching each field type', async () => {
    const { instance } = await mountForm();
    expect(instance.el.querySelector('#intake-patient-name')?.getAttribute('type')).toBe('text');
    expect(instance.el.querySelector('textarea#intake-reason')).not.toBeNull();
    expect(instance.el.querySelector('#intake-consent')?.getAttribute('type')).toBe('checkbox');
    expect(instance.el.querySelector('select#intake-country')).not.toBeNull();
    expect(instance.el.querySelector('#intake-scan')?.getAttribute('type')).toBe('file');
  });

  it('marks a sensitive field and masks its input', async () => {
    const { instance } = await mountForm();
    const field = instance.el.querySelectorAll('.mdma-form-field')[1];
    expect(field.className).toContain('mdma-form-field--sensitive');
    expect(field.querySelector('.mdma-sensitive-badge')).not.toBeNull();
    expect(instance.el.querySelector('#intake-ssn')?.getAttribute('type')).toBe('password');
  });

  it('dispatches FIELD_CHANGED as the user types', async () => {
    const { instance, store, refresh } = await mountForm();
    const input = instance.el.querySelector<HTMLInputElement>('#intake-patient-name');
    if (!input) throw new Error('missing input');

    input.value = 'Ada';
    input.dispatchEvent(new Event('input'));
    refresh();

    expect(store.getComponentState('intake')?.values['patient-name']).toBe('Ada');
  });

  it('dispatches the checkbox value as a boolean', async () => {
    const { instance, store } = await mountForm();
    const box = instance.el.querySelector<HTMLInputElement>('#intake-consent');
    if (!box) throw new Error('missing checkbox');

    box.checked = true;
    box.dispatchEvent(new Event('change'));

    expect(store.getComponentState('intake')?.values.consent).toBe(true);
  });

  it('fills a select from the named data source', async () => {
    const { instance } = await mountForm({
      dataSources: { countries: [{ label: 'Poland', value: 'pl' }] },
    });
    const options = instance.el.querySelectorAll('#intake-country option');
    expect(Array.from(options).map((option) => option.textContent)).toEqual([
      'Select...',
      'Poland',
    ]);
  });

  it('triggers the submit action', async () => {
    const { instance, store } = await mountForm();
    const actions: string[] = [];
    store.getEventBus().on('ACTION_TRIGGERED', (action) => actions.push(action.actionId));

    instance.el.querySelector<HTMLButtonElement>('.mdma-form-submit')?.click();

    expect(actions).toEqual(['submit-intake']);
  });

  it('uses a host element override in place of the default input', async () => {
    const GlassInput: ElementRenderer<FormInputElementProps> = (initial) => {
      let props = initial;
      const input = el('input', { id: props.id, class: 'glass' });
      const instance: ElementInstance<FormInputElementProps> = {
        el: input,
        update(next) {
          props = next;
          input.value = props.value;
        },
      };
      return instance;
    };

    const { instance } = await mountForm({ elementOverrides: { form: { input: GlassInput } } });
    expect(instance.el.querySelectorAll('input.glass')).toHaveLength(2);
  });

  it('reuses the same input elements when only values change', async () => {
    const { instance, store, refresh } = await mountForm();
    const before = instance.el.querySelector('#intake-patient-name');

    store.dispatch({
      type: 'FIELD_CHANGED',
      componentId: 'intake',
      field: 'patient-name',
      value: 'Grace',
    });
    refresh();

    expect(instance.el.querySelector('#intake-patient-name')).toBe(before);
    expect(instance.el.querySelector<HTMLInputElement>('#intake-patient-name')?.value).toBe(
      'Grace',
    );
  });
});
