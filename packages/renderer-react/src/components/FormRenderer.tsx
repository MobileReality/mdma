import { memo } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaContext } from '../context/MdmaProvider.js';
import {
  useElementOverride,
  type FormInputElementProps,
  type FormSelectElementProps,
  type FormCheckboxElementProps,
  type FormTextareaElementProps,
  type FormSubmitElementProps,
} from '../context/ElementOverridesContext.js';

// ─── Default sub-elements ────────────────────────────────────────────────────

function DefaultInput({ id, type, value, onChange, required }: FormInputElementProps) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function DefaultSelect({ id, value, onChange, required, options }: FormSelectElementProps) {
  return (
    <select id={id} value={value} required={required} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select...</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function DefaultCheckbox({ id, checked, onChange }: FormCheckboxElementProps) {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

function DefaultTextarea({ id, value, onChange, required }: FormTextareaElementProps) {
  return (
    <textarea
      id={id}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function DefaultSubmitButton({ onClick, label }: FormSubmitElementProps) {
  return (
    <button type="button" className="mdma-form-submit" onClick={onClick}>
      {label}
    </button>
  );
}

// ─── FormRenderer ────────────────────────────────────────────────────────────

export const FormRenderer = memo(function FormRenderer({ component, componentState, dispatch }: MdmaBlockRendererProps) {
  // Hooks must be called unconditionally (Rules of Hooks)
  const { dataSources } = useMdmaContext();
  const Input = useElementOverride<FormInputElementProps>('form', 'input') ?? DefaultInput;
  const Select = useElementOverride<FormSelectElementProps>('form', 'select') ?? DefaultSelect;
  const Checkbox = useElementOverride<FormCheckboxElementProps>('form', 'checkbox') ?? DefaultCheckbox;
  const Textarea = useElementOverride<FormTextareaElementProps>('form', 'textarea') ?? DefaultTextarea;
  const SubmitButton = useElementOverride<FormSubmitElementProps>('form', 'submitButton') ?? DefaultSubmitButton;

  if (component.type !== 'form') return null;

  return (
    <div className="mdma-form" data-component-id={component.id}>
      {component.label && <h3 className="mdma-form-label">{component.label}</h3>}
      {component.fields.map((field) => {
        const fieldId = `${component.id}-${field.name}`;
        const fieldValue = String(componentState?.values[field.name] ?? '');
        const handleChange = (value: string) =>
          dispatch({ type: 'FIELD_CHANGED', componentId: component.id, field: field.name, value });
        const handleChecked = (checked: boolean) =>
          dispatch({ type: 'FIELD_CHANGED', componentId: component.id, field: field.name, value: checked });

        return (
          <div key={field.name} className="mdma-form-field">
            <label htmlFor={fieldId}>{field.label}</label>
            {field.type === 'select' ? (
              <Select
                id={fieldId}
                name={field.name}
                label={field.label}
                type="select"
                value={fieldValue}
                onChange={handleChange}
                required={field.required}
                options={
                  typeof field.options === 'string'
                    ? (dataSources?.[field.options] ?? [])
                    : (field.options ?? [])
                }
              />
            ) : field.type === 'checkbox' ? (
              <Checkbox
                id={fieldId}
                name={field.name}
                label={field.label}
                checked={Boolean(componentState?.values[field.name])}
                onChange={handleChecked}
              />
            ) : field.type === 'textarea' ? (
              <Textarea
                id={fieldId}
                name={field.name}
                label={field.label}
                value={fieldValue}
                onChange={handleChange}
                required={field.required}
              />
            ) : (
              <Input
                id={fieldId}
                name={field.name}
                label={field.label}
                type={field.type}
                value={fieldValue}
                onChange={handleChange}
                required={field.required}
              />
            )}
          </div>
        );
      })}
      {component.onSubmit && (
        <SubmitButton
          onClick={() =>
            dispatch({ type: 'ACTION_TRIGGERED', componentId: component.id, actionId: component.onSubmit! })
          }
          label="Submit"
        />
      )}
    </div>
  );
});
