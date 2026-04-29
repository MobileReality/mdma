import { memo, useState } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaContext } from '../context/MdmaProvider.js';
import {
  useElementOverride,
  type FormInputElementProps,
  type FormSelectElementProps,
  type FormCheckboxElementProps,
  type FormTextareaElementProps,
  type FormFileElementProps,
  type FormSubmitElementProps,
} from '../context/ElementOverridesContext.js';

// ─── Sensitive field indicator ──────────────────────────────────────────────

function SensitiveIndicator() {
  return (
    <span className="mdma-sensitive-badge" title="This field contains sensitive data (PII)">
      &#128274;
    </span>
  );
}

// ─── Default sub-elements ────────────────────────────────────────────────────

function DefaultInput({ id, type, value, onChange, required, sensitive }: FormInputElementProps) {
  const [masked, setMasked] = useState(sensitive === true && value !== '');
  const displayType = masked ? 'password' : type;

  return (
    <span className={`mdma-input-wrapper ${sensitive ? 'mdma-input--sensitive' : ''}`}>
      <input
        id={id}
        type={displayType}
        value={value}
        required={required}
        placeholder={sensitive ? `Enter ${type}...` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          if (sensitive && masked) setMasked(false);
        }}
      />
      {sensitive && value && (
        <button
          type="button"
          className="mdma-sensitive-toggle"
          onClick={() => setMasked(!masked)}
          title={masked ? 'Reveal value' : 'Mask value'}
        >
          {masked ? '👁' : '👁‍🗨'}
        </button>
      )}
    </span>
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
    <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  );
}

function DefaultTextarea({ id, value, onChange, required, sensitive }: FormTextareaElementProps) {
  return (
    <span className={`mdma-input-wrapper ${sensitive ? 'mdma-input--sensitive' : ''}`}>
      <textarea
        id={id}
        value={value}
        required={required}
        placeholder={sensitive ? 'Enter sensitive data...' : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  );
}

function DefaultFile({ id, value, onChange, required, sensitive }: FormFileElementProps) {
  return (
    <span className={`mdma-input-wrapper mdma-input--file ${sensitive ? 'mdma-input--sensitive' : ''}`}>
      <input
        id={id}
        type="file"
        required={required}
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          onChange(files);
        }}
      />
      {value.length > 0 && (
        <ul className="mdma-file-list">
          {value.map((file) => (
            <li key={`${file.name}-${file.lastModified}-${file.size}`}>
              {sensitive ? '•••' : file.name} <span className="mdma-file-size">({file.size} B)</span>
            </li>
          ))}
        </ul>
      )}
    </span>
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

export const FormRenderer = memo(function FormRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  // Hooks must be called unconditionally (Rules of Hooks)
  const { dataSources } = useMdmaContext();
  const Input = useElementOverride<FormInputElementProps>('form', 'input') ?? DefaultInput;
  const Select = useElementOverride<FormSelectElementProps>('form', 'select') ?? DefaultSelect;
  const Checkbox =
    useElementOverride<FormCheckboxElementProps>('form', 'checkbox') ?? DefaultCheckbox;
  const Textarea =
    useElementOverride<FormTextareaElementProps>('form', 'textarea') ?? DefaultTextarea;
  const FileInput = useElementOverride<FormFileElementProps>('form', 'file') ?? DefaultFile;
  const SubmitButton =
    useElementOverride<FormSubmitElementProps>('form', 'submitButton') ?? DefaultSubmitButton;

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
          dispatch({
            type: 'FIELD_CHANGED',
            componentId: component.id,
            field: field.name,
            value: checked,
          });
        const handleFiles = (files: File[]) =>
          dispatch({
            type: 'FIELD_CHANGED',
            componentId: component.id,
            field: field.name,
            value: files,
          });

        return (
          <div
            key={field.name}
            className={`mdma-form-field ${field.sensitive ? 'mdma-form-field--sensitive' : ''}`}
          >
            <label htmlFor={fieldId}>
              {field.label}
              {field.sensitive && <SensitiveIndicator />}
            </label>
            {field.type === 'select' ? (
              <Select
                id={fieldId}
                name={field.name}
                label={field.label}
                type="select"
                value={fieldValue}
                onChange={handleChange}
                required={field.required}
                sensitive={field.sensitive}
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
                sensitive={field.sensitive}
              />
            ) : field.type === 'textarea' ? (
              <Textarea
                id={fieldId}
                name={field.name}
                label={field.label}
                value={fieldValue}
                onChange={handleChange}
                required={field.required}
                sensitive={field.sensitive}
              />
            ) : field.type === 'file' ? (
              <FileInput
                id={fieldId}
                name={field.name}
                label={field.label}
                value={
                  Array.isArray(componentState?.values[field.name])
                    ? (componentState.values[field.name] as File[])
                    : []
                }
                onChange={handleFiles}
                required={field.required}
                sensitive={field.sensitive}
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
                sensitive={field.sensitive}
              />
            )}
          </div>
        );
      })}
      {component.onSubmit && (
        <SubmitButton
          onClick={() =>
            dispatch({
              type: 'ACTION_TRIGGERED',
              componentId: component.id,
              actionId: component.onSubmit!,
            })
          }
          label="Submit"
        />
      )}
    </div>
  );
});
