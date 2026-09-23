import type { ElementInstance, ElementRenderer } from '../../context/render-context.js';
import { clear, el, isFocused, setInputValue } from '../../dom/el.js';
import type {
  FormCheckboxElementProps,
  FormFileElementProps,
  FormInputElementProps,
  FormSelectElementProps,
  FormSensitiveIndicatorElementProps,
  FormSubmitElementProps,
  FormTextareaElementProps,
} from './element-props.js';

const wrapperClass = (sensitive?: boolean, extra = '') =>
  `mdma-input-wrapper ${extra} ${sensitive ? 'mdma-input--sensitive' : ''}`
    .replace(/\s+/g, ' ')
    .trim();

export const DefaultInput: ElementRenderer<FormInputElementProps> = (initial) => {
  let props = initial;
  // A sensitive field starts masked; the toggle is per-field UI state, not
  // document state, so it never reaches the store.
  let masked = initial.sensitive === true;

  const input = el('input', {
    id: props.id,
    type: masked ? 'password' : props.type,
    on: { input: (event) => props.onChange((event.target as HTMLInputElement).value) },
  });
  setInputValue(input, props.value);

  const toggle = el('button', {
    type: 'button',
    class: 'mdma-sensitive-toggle',
    on: {
      click: () => {
        masked = !masked;
        applyMasking();
      },
    },
  });

  const root = el('span', {}, [input, toggle]);

  function applyMasking() {
    input.setAttribute('type', masked ? 'password' : props.type);
    toggle.textContent = masked ? '👁' : '🔒';
    toggle.setAttribute('title', masked ? 'Reveal value' : 'Mask value');
    toggle.hidden = !(props.sensitive && props.value);
  }

  function apply() {
    root.className = wrapperClass(props.sensitive);
    input.id = props.id;
    input.toggleAttribute('required', props.required === true);
    if (props.sensitive) input.setAttribute('placeholder', `Enter ${props.type}...`);
    else input.removeAttribute('placeholder');
    setInputValue(input, props.value);
    applyMasking();
  }
  apply();

  const instance: ElementInstance<FormInputElementProps> = {
    el: root,
    update(next) {
      props = next;
      apply();
    },
  };
  return instance;
};

function sameOptions(
  a: FormSelectElementProps['options'],
  b: FormSelectElementProps['options'],
): boolean {
  return (
    a.length === b.length &&
    a.every((option, index) => option.value === b[index]?.value && option.label === b[index]?.label)
  );
}

export const DefaultSelect: ElementRenderer<FormSelectElementProps> = (initial) => {
  let props = initial;

  const select = el('select', {
    id: props.id,
    on: { change: (event) => props.onChange((event.target as HTMLSelectElement).value) },
  });

  let renderedOptions: FormSelectElementProps['options'] | undefined;

  function renderOptions() {
    clear(select);
    select.appendChild(el('option', { value: '' }, ['Select...']));
    for (const option of props.options) {
      select.appendChild(el('option', { value: option.value }, [option.label]));
    }
    renderedOptions = props.options;
  }

  function apply() {
    const focused = isFocused(select);
    if (!renderedOptions || !sameOptions(renderedOptions, props.options)) {
      const shown = select.value;
      renderOptions();
      if (focused) select.value = shown;
    }
    select.id = props.id;
    select.toggleAttribute('required', props.required === true);
    if (!focused && select.value !== props.value) select.value = props.value;
  }
  apply();

  return {
    el: select,
    update(next) {
      props = next;
      apply();
    },
  };
};

export const DefaultCheckbox: ElementRenderer<FormCheckboxElementProps> = (initial) => {
  let props = initial;

  const input = el('input', {
    id: props.id,
    type: 'checkbox',
    on: { change: (event) => props.onChange((event.target as HTMLInputElement).checked) },
  });
  input.checked = props.checked;

  return {
    el: input,
    update(next) {
      props = next;
      input.id = props.id;
      input.checked = props.checked;
    },
  };
};

export const DefaultTextarea: ElementRenderer<FormTextareaElementProps> = (initial) => {
  let props = initial;

  const textarea = el('textarea', {
    id: props.id,
    on: { input: (event) => props.onChange((event.target as HTMLTextAreaElement).value) },
  });
  setInputValue(textarea, props.value);

  const root = el('span', {}, [textarea]);

  function apply() {
    root.className = wrapperClass(props.sensitive);
    textarea.id = props.id;
    textarea.toggleAttribute('required', props.required === true);
    if (props.sensitive) textarea.setAttribute('placeholder', 'Enter sensitive data...');
    else textarea.removeAttribute('placeholder');
    setInputValue(textarea, props.value);
  }
  apply();

  return {
    el: root,
    update(next) {
      props = next;
      apply();
    },
  };
};

export const DefaultFile: ElementRenderer<FormFileElementProps> = (initial) => {
  let props = initial;

  const input = el('input', {
    id: props.id,
    type: 'file',
    on: {
      change: (event) => {
        const files = (event.target as HTMLInputElement).files;
        props.onChange(files ? Array.from(files) : []);
      },
    },
  });

  const list = el('ul', { class: 'mdma-file-list' });
  const root = el('span', {}, [input, list]);

  function apply() {
    root.className = wrapperClass(props.sensitive, 'mdma-input--file');
    input.id = props.id;
    input.toggleAttribute('required', props.required === true);

    clear(list);
    list.hidden = props.value.length === 0;
    for (const file of props.value) {
      list.appendChild(
        el('li', {}, [
          props.sensitive ? '•••' : file.name,
          ' ',
          el('span', { class: 'mdma-file-size' }, [`(${file.size} B)`]),
        ]),
      );
    }
  }
  apply();

  return {
    el: root,
    update(next) {
      props = next;
      apply();
    },
  };
};

export const DefaultSubmitButton: ElementRenderer<FormSubmitElementProps> = (initial) => {
  let props = initial;

  const button = el(
    'button',
    { type: 'button', class: 'mdma-form-submit', on: { click: () => props.onClick() } },
    [props.label],
  );

  return {
    el: button,
    update(next) {
      props = next;
      button.textContent = props.label;
    },
  };
};

export const DefaultSensitiveIndicator: ElementRenderer<FormSensitiveIndicatorElementProps> = (
  initial,
) => {
  let props = initial;

  const badge = el(
    'span',
    { class: 'mdma-sensitive-badge', title: `${props.label} contains sensitive data (PII)` },
    ['\u{1F512}'],
  );

  return {
    el: badge,
    update(next) {
      props = next;
      badge.setAttribute('title', `${props.label} contains sensitive data (PII)`);
    },
  };
};
