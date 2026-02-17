import { memo } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

export const FormRenderer = memo(function FormRenderer({ component, componentState, dispatch }: MdmaBlockRendererProps) {
  if (component.type !== 'form') return null;

  return (
    <div className="mdma-form" data-component-id={component.id}>
      {component.label && <h3 className="mdma-form-label">{component.label}</h3>}
      {component.fields.map((field) => (
        <div key={field.name} className="mdma-form-field">
          <label htmlFor={`${component.id}-${field.name}`}>{field.label}</label>
          {field.type === 'select' ? (
            <select
              id={`${component.id}-${field.name}`}
              value={String(componentState?.values[field.name] ?? '')}
              required={field.required}
              onChange={(e) =>
                dispatch({
                  type: 'FIELD_CHANGED',
                  componentId: component.id,
                  field: field.name,
                  value: e.target.value,
                })
              }
            >
              <option value="">Select...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.type === 'checkbox' ? (
            <input
              id={`${component.id}-${field.name}`}
              type="checkbox"
              checked={Boolean(componentState?.values[field.name])}
              onChange={(e) =>
                dispatch({
                  type: 'FIELD_CHANGED',
                  componentId: component.id,
                  field: field.name,
                  value: e.target.checked,
                })
              }
            />
          ) : field.type === 'textarea' ? (
            <textarea
              id={`${component.id}-${field.name}`}
              value={String(componentState?.values[field.name] ?? '')}
              required={field.required}
              onChange={(e) =>
                dispatch({
                  type: 'FIELD_CHANGED',
                  componentId: component.id,
                  field: field.name,
                  value: e.target.value,
                })
              }
            />
          ) : (
            <input
              id={`${component.id}-${field.name}`}
              type={field.type}
              value={String(componentState?.values[field.name] ?? '')}
              required={field.required}
              onChange={(e) =>
                dispatch({
                  type: 'FIELD_CHANGED',
                  componentId: component.id,
                  field: field.name,
                  value: e.target.value,
                })
              }
            />
          )}
        </div>
      ))}
      {component.onSubmit && (
        <button
          type="button"
          className="mdma-form-submit"
          onClick={() =>
            dispatch({
              type: 'ACTION_TRIGGERED',
              componentId: component.id,
              actionId: component.onSubmit!,
            })
          }
        >
          Submit
        </button>
      )}
    </div>
  );
});
