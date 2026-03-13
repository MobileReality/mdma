import { useState } from 'react';
import type {
  ComponentConfig,
  ComponentType,
  FormFieldConfig,
} from '../hooks/use-prompt-builder.js';

interface ComponentConfiguratorProps {
  components: ComponentConfig[];
  onUpdate: (type: ComponentType, update: Partial<ComponentConfig>) => void;
}

export function ComponentConfigurator({ components, onUpdate }: ComponentConfiguratorProps) {
  const enabled = components.filter((c) => c.enabled && c.type !== 'thinking');

  if (enabled.length === 0) {
    return (
      <p style={{ color: '#666', fontSize: '13px', fontStyle: 'italic' }}>
        Select components above to configure them.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#e0e0e0' }}>
        Configure Components
      </h3>
      {enabled.map((comp) => (
        <ConfigPanel key={comp.type} config={comp} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

function ConfigPanel({
  config,
  onUpdate,
}: {
  config: ComponentConfig;
  onUpdate: (type: ComponentType, update: Partial<ComponentConfig>) => void;
}) {
  switch (config.type) {
    case 'form':
      return <FormConfig config={config} onUpdate={onUpdate} />;
    case 'approval-gate':
      return <ApprovalConfig config={config} onUpdate={onUpdate} />;
    case 'tasklist':
      return <TasklistConfig config={config} onUpdate={onUpdate} />;
    case 'table':
      return <TableConfig config={config} onUpdate={onUpdate} />;
    default:
      return (
        <div style={panelStyle}>
          <span style={panelTitleStyle}>{config.type}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>No additional configuration needed.</span>
        </div>
      );
  }
}

function FormConfig({
  config,
  onUpdate,
}: {
  config: ComponentConfig;
  onUpdate: (type: ComponentType, update: Partial<ComponentConfig>) => void;
}) {
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
    <div style={panelStyle}>
      <span style={panelTitleStyle}>Form Fields</span>

      {fields.map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span style={{ color: '#a5b4fc', fontWeight: 500 }}>{f.name}</span>
          <span style={{ color: '#666' }}>({f.type})</span>
          <span style={{ color: '#888' }}>"{f.label}"</span>
          {f.required && <span style={{ color: '#f59e0b', fontSize: '10px' }}>required</span>}
          {f.sensitive && <span style={{ color: '#ef4444', fontSize: '10px' }}>sensitive</span>}
          <button onClick={() => removeField(i)} style={removeBtnStyle}>x</button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="name"
          value={newField.name}
          onChange={(e) => setNewField((p) => ({ ...p, name: e.target.value }))}
          style={{ ...smallInputStyle, width: '80px' }}
        />
        <input
          placeholder="label"
          value={newField.label}
          onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))}
          style={{ ...smallInputStyle, width: '100px' }}
        />
        <select
          value={newField.type}
          onChange={(e) => setNewField((p) => ({ ...p, type: e.target.value as FormFieldConfig['type'] }))}
          style={smallInputStyle}
        >
          {['text', 'number', 'email', 'date', 'select', 'checkbox', 'textarea'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label style={{ fontSize: '11px', color: '#888', display: 'flex', gap: '3px', alignItems: 'center' }}>
          <input type="checkbox" checked={newField.required} onChange={(e) => setNewField((p) => ({ ...p, required: e.target.checked }))} />
          req
        </label>
        <label style={{ fontSize: '11px', color: '#888', display: 'flex', gap: '3px', alignItems: 'center' }}>
          <input type="checkbox" checked={newField.sensitive} onChange={(e) => setNewField((p) => ({ ...p, sensitive: e.target.checked }))} />
          PII
        </label>
        <button onClick={addField} style={addBtnStyle}>+ Add</button>
      </div>
    </div>
  );
}

function ApprovalConfig({
  config,
  onUpdate,
}: {
  config: ComponentConfig;
  onUpdate: (type: ComponentType, update: Partial<ComponentConfig>) => void;
}) {
  const ag = config.approvalGate ?? { roles: [], requiredApprovers: 1, requireReason: false };
  const [newRole, setNewRole] = useState('');

  const addRole = () => {
    if (!newRole) return;
    onUpdate('approval-gate', {
      approvalGate: { ...ag, roles: [...ag.roles, newRole] },
    });
    setNewRole('');
  };

  return (
    <div style={panelStyle}>
      <span style={panelTitleStyle}>Approval Gate</span>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {ag.roles.map((r, i) => (
          <span key={i} style={{ background: '#1e1b4b', color: '#a5b4fc', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
            {r}
            <button
              onClick={() => onUpdate('approval-gate', { approvalGate: { ...ag, roles: ag.roles.filter((_, j) => j !== i) } })}
              style={{ ...removeBtnStyle, marginLeft: '4px' }}
            >x</button>
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <input
          placeholder="role name"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addRole()}
          style={smallInputStyle}
        />
        <button onClick={addRole} style={addBtnStyle}>+ Role</button>
      </div>

      <label style={{ fontSize: '12px', color: '#888', display: 'flex', gap: '8px', alignItems: 'center' }}>
        Required approvers:
        <input
          type="number"
          min={1}
          value={ag.requiredApprovers}
          onChange={(e) => onUpdate('approval-gate', { approvalGate: { ...ag, requiredApprovers: Number(e.target.value) } })}
          style={{ ...smallInputStyle, width: '50px' }}
        />
      </label>

      <label style={{ fontSize: '12px', color: '#888', display: 'flex', gap: '4px', alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={ag.requireReason}
          onChange={(e) => onUpdate('approval-gate', { approvalGate: { ...ag, requireReason: e.target.checked } })}
        />
        Require reason on denial
      </label>
    </div>
  );
}

function TasklistConfig({
  config,
  onUpdate,
}: {
  config: ComponentConfig;
  onUpdate: (type: ComponentType, update: Partial<ComponentConfig>) => void;
}) {
  const items = config.tasklist?.items ?? [];
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (!newItem) return;
    onUpdate('tasklist', { tasklist: { items: [...items, newItem] } });
    setNewItem('');
  };

  return (
    <div style={panelStyle}>
      <span style={panelTitleStyle}>Tasklist Items</span>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ color: '#e0e0e0' }}>{item}</span>
          <button
            onClick={() => onUpdate('tasklist', { tasklist: { items: items.filter((_, j) => j !== i) } })}
            style={removeBtnStyle}
          >x</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          placeholder="New task item"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          style={{ ...smallInputStyle, flex: 1 }}
        />
        <button onClick={addItem} style={addBtnStyle}>+ Add</button>
      </div>
    </div>
  );
}

function TableConfig({
  config,
  onUpdate,
}: {
  config: ComponentConfig;
  onUpdate: (type: ComponentType, update: Partial<ComponentConfig>) => void;
}) {
  const columns = config.table?.columns ?? [];
  const [newCol, setNewCol] = useState({ key: '', header: '' });

  const addColumn = () => {
    if (!newCol.key || !newCol.header) return;
    onUpdate('table', { table: { columns: [...columns, { ...newCol }] } });
    setNewCol({ key: '', header: '' });
  };

  return (
    <div style={panelStyle}>
      <span style={panelTitleStyle}>Table Columns</span>
      {columns.map((col, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ color: '#a5b4fc' }}>{col.key}</span>
          <span style={{ color: '#888' }}>"{col.header}"</span>
          <button
            onClick={() => onUpdate('table', { table: { columns: columns.filter((_, j) => j !== i) } })}
            style={removeBtnStyle}
          >x</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          placeholder="key"
          value={newCol.key}
          onChange={(e) => setNewCol((p) => ({ ...p, key: e.target.value }))}
          style={{ ...smallInputStyle, width: '80px' }}
        />
        <input
          placeholder="header"
          value={newCol.header}
          onChange={(e) => setNewCol((p) => ({ ...p, header: e.target.value }))}
          style={{ ...smallInputStyle, flex: 1 }}
        />
        <button onClick={addColumn} style={addBtnStyle}>+ Add</button>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '10px',
  border: '1px solid #333',
  borderRadius: '6px',
  background: '#111',
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#a5b4fc',
  textTransform: 'capitalize',
};

const smallInputStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #333',
  borderRadius: '4px',
  background: '#1a1a1a',
  color: '#e0e0e0',
  fontSize: '12px',
  outline: 'none',
};

const addBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid #6366f1',
  borderRadius: '4px',
  background: '#1e1b4b',
  color: '#a5b4fc',
  fontSize: '11px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const removeBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'none',
  color: '#666',
  cursor: 'pointer',
  fontSize: '12px',
  padding: '0 2px',
};
