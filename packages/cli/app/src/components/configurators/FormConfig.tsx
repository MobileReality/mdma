import { useState } from 'react';
import { SmallInput } from '../ui/SmallInput.js';
import { SmallButton } from '../ui/SmallButton.js';
import type {
  ComponentConfig,
  ComponentType,
  FormFieldConfig,
} from '../../hooks/use-prompt-builder.js';

interface FormConfigProps {
  config: ComponentConfig;
  onUpdate: (type: ComponentType, update: Partial<ComponentConfig>) => void;
}

export function FormConfig({ config, onUpdate }: FormConfigProps) {
  const fields = config.form?.fields ?? [];
  const [newField, setNewField] = useState<FormFieldConfig>({
    name: '',
    type: 'text',
    label: '',
    required: false,
    sensitive: false,
  });

  const addField = () => {
    if (!newField.name || !newField.label) return;
    onUpdate('form', { form: { fields: [...fields, { ...newField }] } });
    setNewField({ name: '', type: 'text', label: '', required: false, sensitive: false });
  };

  const removeField = (index: number) => {
    onUpdate('form', { form: { fields: fields.filter((_, i) => i !== index) } });
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 border border-border rounded-md bg-surface-1">
      <span className="text-[13px] font-semibold text-primary-text">Form Fields</span>

      {fields.map((f, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="font-medium text-primary-text">{f.name}</span>
          <span className="text-text-muted">({f.type})</span>
          <span className="text-text-secondary">"{f.label}"</span>
          {f.required && <span className="text-warning text-[10px]">required</span>}
          {f.sensitive && <span className="text-error text-[10px]">sensitive</span>}
          <SmallButton variant="ghost" onClick={() => removeField(i)}>
            x
          </SmallButton>
        </div>
      ))}

      <div className="flex gap-1.5 flex-wrap items-center">
        <SmallInput
          placeholder="name"
          value={newField.name}
          onChange={(e) => setNewField((p) => ({ ...p, name: e.target.value }))}
          className="w-20"
        />
        <SmallInput
          placeholder="label"
          value={newField.label}
          onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))}
          className="w-24"
        />
        <select
          value={newField.type}
          onChange={(e) =>
            setNewField((p) => ({ ...p, type: e.target.value as FormFieldConfig['type'] }))
          }
          className="px-2 py-1 border border-border rounded bg-surface-2 text-text-primary text-xs outline-none focus:border-primary"
        >
          {['text', 'number', 'email', 'date', 'select', 'checkbox', 'textarea'].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="text-[11px] text-text-secondary flex items-center gap-1">
          <input
            type="checkbox"
            checked={newField.required}
            onChange={(e) => setNewField((p) => ({ ...p, required: e.target.checked }))}
          />
          req
        </label>
        <label className="text-[11px] text-text-secondary flex items-center gap-1">
          <input
            type="checkbox"
            checked={newField.sensitive}
            onChange={(e) => setNewField((p) => ({ ...p, sensitive: e.target.checked }))}
          />
          PII
        </label>
        <SmallButton onClick={addField}>+ Add</SmallButton>
      </div>
    </div>
  );
}
