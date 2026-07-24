import { defineComponent, h, ref, type PropType, type VNodeChild } from 'vue';
import { blockRendererProps } from '../renderers/renderer-props.js';
import { useMdmaContext } from '../context/MdmaProvider.js';
import {
  useElementOverride,
  type FormCheckboxElementProps,
  type FormFileElementProps,
  type FormInputElementProps,
  type FormSelectElementProps,
  type FormSensitiveIndicatorElementProps,
  type FormSubmitElementProps,
  type FormTextareaElementProps,
} from '../context/ElementOverridesContext.js';

// ─── Sensitive field indicator ──────────────────────────────────────────────

const DefaultSensitiveIndicator = defineComponent({
  name: 'MdmaSensitiveIndicator',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: true },
  },
  setup(props: FormSensitiveIndicatorElementProps) {
    return () =>
      h(
        'span',
        {
          class: 'mdma-sensitive-badge',
          title: `${props.label} contains sensitive data (PII)`,
        },
        '\u{1F512}',
      );
  },
});

// ─── Default sub-elements ────────────────────────────────────────────────────

/** Props shared by the text-ish inputs; `onChange` is a plain callback prop. */
const baseElementProps = {
  id: { type: String, required: true as const },
  name: { type: String, required: true as const },
  label: { type: String, required: true as const },
  onChange: { type: Function as PropType<(value: string) => void>, required: true as const },
  required: { type: Boolean, default: undefined },
  sensitive: { type: Boolean, default: undefined },
};

const DefaultInput = defineComponent({
  name: 'MdmaInput',
  props: {
    ...baseElementProps,
    type: { type: String, required: true },
    value: { type: String, required: true },
  },
  setup(props: FormInputElementProps) {
    // A sensitive field starts masked; the toggle is per-field UI state, not
    // document state, so it never reaches the store.
    const masked = ref(props.sensitive === true);

    return () =>
      h('span', { class: `mdma-input-wrapper ${props.sensitive ? 'mdma-input--sensitive' : ''}` }, [
        h('input', {
          id: props.id,
          type: masked.value ? 'password' : props.type,
          value: props.value,
          required: props.required,
          placeholder: props.sensitive ? `Enter ${props.type}...` : undefined,
          onInput: (e: Event) => props.onChange((e.target as HTMLInputElement).value),
        }),
        props.sensitive && props.value
          ? h(
              'button',
              {
                type: 'button',
                class: 'mdma-sensitive-toggle',
                title: masked.value ? 'Reveal value' : 'Mask value',
                onClick: () => {
                  masked.value = !masked.value;
                },
              },
              masked.value ? '👁' : '🔒',
            )
          : null,
      ]);
  },
});

const DefaultSelect = defineComponent({
  name: 'MdmaSelect',
  props: {
    ...baseElementProps,
    type: { type: String, required: true },
    value: { type: String, required: true },
    options: {
      type: Array as PropType<{ label: string; value: string }[]>,
      required: true,
    },
  },
  setup(props: FormSelectElementProps) {
    return () =>
      h(
        'select',
        {
          id: props.id,
          value: props.value,
          required: props.required,
          onChange: (e: Event) => props.onChange((e.target as HTMLSelectElement).value),
        },
        [
          h('option', { value: '' }, 'Select...'),
          ...props.options.map((opt) =>
            h('option', { key: opt.value, value: opt.value }, opt.label),
          ),
        ],
      );
  },
});

const DefaultCheckbox = defineComponent({
  name: 'MdmaCheckbox',
  props: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    label: { type: String, required: true },
    checked: { type: Boolean, required: true },
    onChange: { type: Function as PropType<(checked: boolean) => void>, required: true },
    sensitive: { type: Boolean, default: undefined },
  },
  setup(props: FormCheckboxElementProps) {
    return () =>
      h('input', {
        id: props.id,
        type: 'checkbox',
        checked: props.checked,
        onChange: (e: Event) => props.onChange((e.target as HTMLInputElement).checked),
      });
  },
});

const DefaultTextarea = defineComponent({
  name: 'MdmaTextarea',
  props: {
    ...baseElementProps,
    value: { type: String, required: true },
  },
  setup(props: FormTextareaElementProps) {
    return () =>
      h('span', { class: `mdma-input-wrapper ${props.sensitive ? 'mdma-input--sensitive' : ''}` }, [
        h('textarea', {
          id: props.id,
          value: props.value,
          required: props.required,
          placeholder: props.sensitive ? 'Enter sensitive data...' : undefined,
          onInput: (e: Event) => props.onChange((e.target as HTMLTextAreaElement).value),
        }),
      ]);
  },
});

const DefaultFile = defineComponent({
  name: 'MdmaFileInput',
  props: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: Array as PropType<File[]>, required: true },
    onChange: { type: Function as PropType<(files: File[]) => void>, required: true },
    required: { type: Boolean, default: undefined },
    sensitive: { type: Boolean, default: undefined },
  },
  setup(props: FormFileElementProps) {
    return () =>
      h(
        'span',
        {
          class: `mdma-input-wrapper mdma-input--file ${
            props.sensitive ? 'mdma-input--sensitive' : ''
          }`,
        },
        [
          h('input', {
            id: props.id,
            type: 'file',
            required: props.required,
            onChange: (e: Event) => {
              const files = (e.target as HTMLInputElement).files;
              props.onChange(files ? Array.from(files) : []);
            },
          }),
          props.value.length > 0
            ? h(
                'ul',
                { class: 'mdma-file-list' },
                props.value.map((file) =>
                  h('li', { key: `${file.name}-${file.lastModified}-${file.size}` }, [
                    props.sensitive ? '•••' : file.name,
                    ' ',
                    h('span', { class: 'mdma-file-size' }, `(${file.size} B)`),
                  ]),
                ),
              )
            : null,
        ],
      );
  },
});

const DefaultSubmitButton = defineComponent({
  name: 'MdmaSubmitButton',
  props: {
    onClick: { type: Function as PropType<() => void>, required: true },
    label: { type: String, required: true },
  },
  setup(props: FormSubmitElementProps) {
    return () =>
      h(
        'button',
        { type: 'button', class: 'mdma-form-submit', onClick: props.onClick },
        props.label,
      );
  },
});

// ─── FormRenderer ────────────────────────────────────────────────────────────

export const FormRenderer = defineComponent({
  name: 'FormRenderer',
  props: blockRendererProps,
  setup(props) {
    const ctx = useMdmaContext();
    // Overrides resolve to refs, so a document whose customizations change swaps
    // the sub-elements without remounting the form.
    const Input = useElementOverride('form', 'input');
    const Select = useElementOverride('form', 'select');
    const Checkbox = useElementOverride('form', 'checkbox');
    const Textarea = useElementOverride('form', 'textarea');
    const FileInput = useElementOverride('form', 'file');
    const SubmitButton = useElementOverride('form', 'submitButton');
    const SensitiveMark = useElementOverride('form', 'sensitiveIndicator');

    return () => {
      const component = props.component;
      if (component.type !== 'form') return null;

      const values = props.componentState?.values ?? {};

      const fields = component.fields.map((field) => {
        const fieldId = `${component.id}-${field.name}`;
        const fieldValue = String(values[field.name] ?? '');

        const handleChange = (value: string) =>
          props.dispatch({
            type: 'FIELD_CHANGED',
            componentId: component.id,
            field: field.name,
            value,
          });
        const handleChecked = (checked: boolean) =>
          props.dispatch({
            type: 'FIELD_CHANGED',
            componentId: component.id,
            field: field.name,
            value: checked,
          });
        const handleFiles = (files: File[]) =>
          props.dispatch({
            type: 'FIELD_CHANGED',
            componentId: component.id,
            field: field.name,
            value: files,
          });

        const shared = {
          id: fieldId,
          name: field.name,
          label: field.label,
          required: field.required,
          sensitive: field.sensitive,
        };

        let control: VNodeChild;
        if (field.type === 'select') {
          control = h(Select.value ?? DefaultSelect, {
            ...shared,
            type: 'select',
            value: fieldValue,
            onChange: handleChange,
            options:
              typeof field.options === 'string'
                ? (ctx.value.dataSources?.[field.options] ?? [])
                : (field.options ?? []),
          });
        } else if (field.type === 'checkbox') {
          control = h(Checkbox.value ?? DefaultCheckbox, {
            id: fieldId,
            name: field.name,
            label: field.label,
            checked: Boolean(values[field.name]),
            onChange: handleChecked,
            sensitive: field.sensitive,
          });
        } else if (field.type === 'textarea') {
          control = h(Textarea.value ?? DefaultTextarea, {
            ...shared,
            value: fieldValue,
            onChange: handleChange,
          });
        } else if (field.type === 'file') {
          control = h(FileInput.value ?? DefaultFile, {
            ...shared,
            value: Array.isArray(values[field.name]) ? (values[field.name] as File[]) : [],
            onChange: handleFiles,
          });
        } else {
          control = h(Input.value ?? DefaultInput, {
            ...shared,
            type: field.type,
            value: fieldValue,
            onChange: handleChange,
          });
        }

        return h(
          'div',
          {
            key: field.name,
            class: `mdma-form-field ${field.sensitive ? 'mdma-form-field--sensitive' : ''}`,
          },
          [
            h('label', { for: fieldId }, [
              field.label,
              field.sensitive
                ? h(SensitiveMark.value ?? DefaultSensitiveIndicator, {
                    name: field.name,
                    label: field.label,
                  })
                : null,
            ]),
            control,
          ],
        );
      });

      return h('div', { class: 'mdma-form', 'data-component-id': component.id }, [
        component.label ? h('h3', { class: 'mdma-form-label' }, component.label) : null,
        ...fields,
        component.onSubmit
          ? h(SubmitButton.value ?? DefaultSubmitButton, {
              label: 'Submit',
              onClick: () =>
                props.dispatch({
                  type: 'ACTION_TRIGGERED',
                  componentId: component.id,
                  actionId: component.onSubmit as string,
                }),
            })
          : null,
      ]);
    };
  },
});
