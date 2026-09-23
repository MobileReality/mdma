import type { FormComponent } from '@mobile-reality/mdma-spec';
import { resolveElementOverride } from '../context/render-context.js';
import type { ElementInstance } from '../context/render-context.js';
import { el } from '../dom/el.js';
import type {
  MdmaBlockRenderer,
  MdmaBlockRendererProps,
  RendererInstance,
} from '../renderers/renderer-props.js';
import {
  DefaultCheckbox,
  DefaultFile,
  DefaultInput,
  DefaultSelect,
  DefaultSensitiveIndicator,
  DefaultSubmitButton,
  DefaultTextarea,
} from './form/default-elements.js';

type GetProps = () => MdmaBlockRendererProps;
type Field = FormComponent['fields'][number];

/** Any change here alters the form's structure, so the fields are rebuilt rather than updated. */
const shapeOf = (component: FormComponent) =>
  [
    component.label ?? '',
    component.onSubmit ?? '',
    ...component.fields.map(
      (field) => `${field.name}:${field.type}:${field.label}:${field.required}:${field.sensitive}`,
    ),
  ].join('|');

interface Built {
  el: HTMLElement;
  fields: Map<string, ElementInstance<never>>;
  submit?: ElementInstance<never>;
  shape: string;
}

function optionsFor(field: Field, props: MdmaBlockRendererProps) {
  if (typeof field.options === 'string') {
    return props.context.dataSources?.[field.options] ?? [];
  }
  return field.options ?? [];
}

function elementPropsFor(
  field: Field,
  component: FormComponent,
  props: MdmaBlockRendererProps,
  getProps: GetProps,
): Record<string, unknown> {
  const values = props.componentState?.values ?? {};
  const shared = {
    id: `${component.id}-${field.name}`,
    name: field.name,
    label: field.label,
    required: field.required,
    sensitive: field.sensitive,
  };

  const change = (value: unknown) =>
    getProps().dispatch({
      type: 'FIELD_CHANGED',
      componentId: component.id,
      field: field.name,
      value,
    });

  if (field.type === 'checkbox') {
    return {
      id: shared.id,
      name: field.name,
      label: field.label,
      sensitive: field.sensitive,
      checked: Boolean(values[field.name]),
      onChange: (checked: boolean) => change(checked),
    };
  }
  if (field.type === 'file') {
    return {
      ...shared,
      value: Array.isArray(values[field.name]) ? (values[field.name] as File[]) : [],
      onChange: (files: File[]) => change(files),
    };
  }
  if (field.type === 'select') {
    return {
      ...shared,
      type: 'select',
      value: String(values[field.name] ?? ''),
      options: optionsFor(field, props),
      onChange: (value: string) => change(value),
    };
  }
  if (field.type === 'textarea') {
    return {
      ...shared,
      value: String(values[field.name] ?? ''),
      onChange: (value: string) => change(value),
    };
  }
  return {
    ...shared,
    type: field.type,
    value: String(values[field.name] ?? ''),
    onChange: (value: string) => change(value),
  };
}

function elementFor(field: Field, props: MdmaBlockRendererProps) {
  const override = (name: string) => resolveElementOverride<never>(props.context, 'form', name);
  if (field.type === 'select') return override('select') ?? DefaultSelect;
  if (field.type === 'checkbox') return override('checkbox') ?? DefaultCheckbox;
  if (field.type === 'textarea') return override('textarea') ?? DefaultTextarea;
  if (field.type === 'file') return override('file') ?? DefaultFile;
  return override('input') ?? DefaultInput;
}

function build(props: MdmaBlockRendererProps, component: FormComponent, getProps: GetProps): Built {
  const fields = new Map<string, ElementInstance<never>>();

  const rows = component.fields.map((field) => {
    const create = elementFor(field, props) as (p: unknown) => ElementInstance<never>;
    const instance = create(elementPropsFor(field, component, props, getProps));
    fields.set(field.name, instance);

    const indicator = field.sensitive
      ? (
          (resolveElementOverride<never>(props.context, 'form', 'sensitiveIndicator') ??
            DefaultSensitiveIndicator) as (p: unknown) => ElementInstance<never>
        )({ name: field.name, label: field.label })
      : undefined;

    return el(
      'div',
      { class: `mdma-form-field ${field.sensitive ? 'mdma-form-field--sensitive' : ''}`.trim() },
      [
        el('label', { for: `${component.id}-${field.name}` }, [field.label, indicator?.el]),
        instance.el,
      ],
    );
  });

  let submit: ElementInstance<never> | undefined;
  if (component.onSubmit) {
    const create = (resolveElementOverride<never>(props.context, 'form', 'submitButton') ??
      DefaultSubmitButton) as (p: unknown) => ElementInstance<never>;
    submit = create({
      label: 'Submit',
      onClick: () =>
        getProps().dispatch({
          type: 'ACTION_TRIGGERED',
          componentId: component.id,
          actionId: component.onSubmit as string,
        }),
    });
  }

  const root = el('div', { class: 'mdma-form', dataset: { 'component-id': component.id } }, [
    component.label && el('h3', { class: 'mdma-form-label' }, [component.label]),
    ...rows,
    submit?.el,
  ]);

  return { el: root, fields, submit, shape: shapeOf(component) };
}

const emptyBuild = (): Built => ({ el: el('div'), fields: new Map(), shape: '' });

/**
 * The one renderer that must update in place. A streamed document re-parses on
 * every chunk, and rebuilding the inputs each time would wipe whatever the user
 * is typing — so the field elements persist and are only re-fed their props.
 */
export const FormRenderer: MdmaBlockRenderer = (initial) => {
  let props = initial;
  const getProps: GetProps = () => props;

  let built =
    initial.component.type === 'form' ? build(initial, initial.component, getProps) : emptyBuild();

  const instance: RendererInstance = {
    el: built.el,
    update(next) {
      props = next;
      if (next.component.type !== 'form') return;

      if (shapeOf(next.component) !== built.shape) {
        const rebuilt = build(next, next.component, getProps);
        built.el.replaceWith(rebuilt.el);
        built = rebuilt;
        instance.el = rebuilt.el;
        return;
      }

      for (const field of next.component.fields) {
        const element = built.fields.get(field.name);
        element?.update(elementPropsFor(field, next.component, next, getProps) as never);
      }
    },
  };

  return instance;
};
