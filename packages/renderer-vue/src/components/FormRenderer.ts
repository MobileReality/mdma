import { computed, defineComponent, h, ref, watch, type PropType, type VNodeChild } from 'vue';
import { isDataDrivenOptions } from '@mobile-reality/mdma-runtime';
import { blockRendererProps } from '../renderers/renderer-props.js';
import { useMdmaContext } from '../context/MdmaProvider.js';
import { useDataState, useDocumentStore } from '../composables/use-document-store.js';
import {
  useElementOverride,
  type FormCheckboxElementProps,
  type FormComboboxElementProps,
  type FormFileElementProps,
  type FormInputElementProps,
  type FormSelectElementProps,
  type FormSensitiveIndicatorElementProps,
  type FormSubmitElementProps,
  type FormTextareaElementProps,
} from '../context/ElementOverridesContext.js';
import { DefaultDataLoading, DefaultDataError } from './DataStateViews.js';

type SelectOption = { label: string; value: string };

function inlineOptions(
  options: unknown,
  dataSources: Record<string, SelectOption[]> | undefined,
): SelectOption[] {
  if (typeof options === 'string') return dataSources?.[options] ?? [];
  return Array.isArray(options) ? options : [];
}

function matchesQuery(option: SelectOption, query: string): boolean {
  return option.label.toLowerCase().includes(query.trim().toLowerCase());
}

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

const DefaultCombobox = defineComponent({
  name: 'MdmaCombobox',
  props: {
    ...baseElementProps,
    type: { type: String, required: true },
    value: { type: String, required: true },
    options: { type: Array as PropType<SelectOption[]>, required: true },
    query: { type: String, required: true },
    onQueryChange: { type: Function as PropType<(query: string) => void>, required: true },
    loading: { type: Boolean, default: undefined },
    error: { type: String, default: undefined },
    onRetry: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props: FormComboboxElementProps) {
    const open = ref(false);
    // the highlight belongs to one result set; new results drop it
    const resultsKey = computed(() => props.options.map((o) => o.value).join('\n'));
    const highlight = ref({ resultsKey: resultsKey.value, index: -1 });
    const active = computed(() =>
      highlight.value.resultsKey === resultsKey.value ? highlight.value.index : -1,
    );
    const setActive = (index: number) => {
      highlight.value = { resultsKey: resultsKey.value, index };
    };
    // the picked option may drop out of later search results; keep its label
    const picked = ref<SelectOption | null>(null);

    const choose = (option: SelectOption) => {
      picked.value = option;
      open.value = false;
      setActive(-1);
      props.onChange(option.value);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        open.value = true;
        setActive(Math.min(active.value + 1, props.options.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(active.value - 1, 0));
      } else if (e.key === 'Enter' && open.value && props.error && props.onRetry) {
        e.preventDefault();
        props.onRetry();
      } else if (e.key === 'Enter' && open.value && props.options[active.value]) {
        e.preventDefault();
        choose(props.options[active.value]);
      } else if (e.key === 'Escape') {
        open.value = false;
        setActive(-1);
        props.onQueryChange('');
      }
    };

    return () => {
      const listboxId = `${props.id}-listbox`;
      const selectedLabel =
        props.options.find((o) => o.value === props.value)?.label ??
        (picked.value?.value === props.value ? picked.value.label : props.value);
      const status = props.error
        ? props.error
        : props.loading && props.options.length === 0
          ? 'Searching...'
          : props.options.length === 0
            ? 'No matches'
            : '';

      return h('span', { class: 'mdma-combobox' }, [
        h('input', {
          id: props.id,
          type: 'text',
          role: 'combobox',
          autocomplete: 'off',
          'aria-autocomplete': 'list',
          'aria-expanded': open.value && !status,
          'aria-controls': listboxId,
          'aria-activedescendant':
            open.value && active.value >= 0 ? `${props.id}-option-${active.value}` : undefined,
          'aria-busy': props.loading || undefined,
          required: props.required && !props.value,
          placeholder: 'Search...',
          value: open.value ? props.query : selectedLabel,
          onFocus: () => {
            open.value = true;
          },
          onBlur: () => {
            open.value = false;
            setActive(-1);
          },
          onInput: (e: Event) => {
            open.value = true;
            setActive(-1);
            props.onQueryChange((e.target as HTMLInputElement).value);
          },
          onKeydown: handleKeyDown,
        }),
        h('div', { class: 'mdma-combobox-popup', hidden: !open.value }, [
          h(
            'ul',
            { id: listboxId, role: 'listbox', class: 'mdma-combobox-listbox', hidden: !!status },
            props.options.map((opt, index) =>
              h(
                'li',
                {
                  key: opt.value,
                  id: `${props.id}-option-${index}`,
                  role: 'option',
                  'aria-selected': opt.value === props.value,
                  class: `mdma-combobox-option${index === active.value ? ' mdma-combobox-option--active' : ''}`,
                  onMousedown: (e: MouseEvent) => e.preventDefault(),
                  onClick: () => choose(opt),
                },
                opt.label,
              ),
            ),
          ),
          h(
            'output',
            { class: `mdma-combobox-status${props.error ? ' mdma-combobox-status--error' : ''}` },
            [
              open.value ? status : null,
              open.value && props.error && props.onRetry
                ? h(
                    'button',
                    {
                      type: 'button',
                      onMousedown: (e: MouseEvent) => e.preventDefault(),
                      onClick: props.onRetry,
                    },
                    'Retry',
                  )
                : null,
            ],
          ),
        ]),
      ]);
    };
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

const DataDrivenSelect = defineComponent({
  name: 'MdmaDataDrivenSelect',
  props: {
    dataKey: { type: String, required: true },
    select: { type: Object, required: true },
    selectProps: { type: Object, required: true },
  },
  setup(props) {
    const store = useDocumentStore();
    const dataState = useDataState(() => props.dataKey);
    const DataLoading = useElementOverride('form', 'dataLoading');
    const DataError = useElementOverride('form', 'dataError');

    return () => {
      const state = dataState.value;
      if (!state || state.status === 'loading') {
        return h(DataLoading.value ?? DefaultDataLoading, { componentId: props.dataKey });
      }
      if (state.status === 'error') {
        return h(DataError.value ?? DefaultDataError, {
          componentId: props.dataKey,
          error: state.error ?? 'Failed to load options',
          onRetry: () => store.value.retryData(props.dataKey),
        });
      }
      return h(props.select as object, {
        ...(props.selectProps as Record<string, unknown>),
        options: state.rows,
      });
    };
  },
});

/**
 * A `searchable: true` select. Inline options are filtered here; a data-source
 * slot gets the typed text as its `filter`, so the resolver does the search.
 */
const SearchableSelect = defineComponent({
  name: 'MdmaSearchableSelect',
  props: {
    combobox: { type: Object, required: true },
    dataKey: { type: String, default: undefined },
    staticOptions: { type: Array as PropType<SelectOption[]>, required: true },
    selectProps: { type: Object, required: true },
  },
  setup(props) {
    const store = useDocumentStore();
    const dataState = useDataState(() => props.dataKey ?? '');
    const query = ref('');

    // a filter left on the slot by an earlier mount would hide options behind an empty input
    watch(
      [() => props.dataKey, store],
      ([key, s]) => {
        if (key && s.getDataState(key)?.filter) s.setDataFilter(key, undefined);
      },
      { immediate: true, flush: 'post' },
    );

    const handleQueryChange = (next: string) => {
      query.value = next;
      if (props.dataKey) store.value.setDataFilter(props.dataKey, next.trim() || undefined);
    };
    const handleChange = (value: string) => {
      (props.selectProps as Pick<FormSelectElementProps, 'onChange'>).onChange(value);
      handleQueryChange('');
    };

    return () => {
      const shared = {
        ...(props.selectProps as Record<string, unknown>),
        onChange: handleChange,
        query: query.value,
        onQueryChange: handleQueryChange,
      };
      const dataKey = props.dataKey;
      if (!dataKey) {
        return h(props.combobox as object, {
          ...shared,
          options: query.value
            ? props.staticOptions.filter((o) => matchesQuery(o, query.value))
            : props.staticOptions,
        });
      }
      const state = dataState.value;
      return h(props.combobox as object, {
        ...shared,
        options: (state?.rows ?? []) as SelectOption[],
        loading: !state || state.status === 'loading' || state.status === 'idle',
        error: state?.status === 'error' ? (state.error ?? 'Failed to load options') : undefined,
        onRetry: () => store.value.retryData(dataKey),
      });
    };
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
    const Combobox = useElementOverride('form', 'combobox');
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
          const dataKey = `${component.id}.${field.name}`;
          const isDataDriven = isDataDrivenOptions(field.options, dataKey, (key) =>
            ctx.value.store.getDataState(key),
          );
          if (field.searchable) {
            control = h(SearchableSelect, {
              combobox: Combobox.value ?? DefaultCombobox,
              dataKey: isDataDriven ? dataKey : undefined,
              staticOptions: inlineOptions(field.options, ctx.value.dataSources),
              selectProps: {
                ...shared,
                type: 'select',
                value: fieldValue,
                onChange: handleChange,
              },
            });
          } else if (isDataDriven) {
            control = h(DataDrivenSelect, {
              dataKey,
              select: Select.value ?? DefaultSelect,
              selectProps: {
                ...shared,
                type: 'select',
                value: fieldValue,
                onChange: handleChange,
              },
            });
          } else {
            control = h(Select.value ?? DefaultSelect, {
              ...shared,
              type: 'select',
              value: fieldValue,
              onChange: handleChange,
              options: inlineOptions(field.options, ctx.value.dataSources),
            });
          }
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
