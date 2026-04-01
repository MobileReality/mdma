import { useState } from 'react';
import { SmallInput } from '../ui/SmallInput.js';
import { SmallButton } from '../ui/SmallButton.js';
import type { ComponentConfig, ComponentType } from '../../hooks/use-prompt-builder.js';

interface TableConfigProps {
  config: ComponentConfig;
  onUpdate: (type: ComponentType, update: Partial<ComponentConfig>) => void;
}

export function TableConfig({ config, onUpdate }: TableConfigProps) {
  const columns = config.table?.columns ?? [];
  const [newCol, setNewCol] = useState({ key: '', header: '' });

  const addColumn = () => {
    if (!newCol.key || !newCol.header) return;
    onUpdate('table', { table: { columns: [...columns, { ...newCol }] } });
    setNewCol({ key: '', header: '' });
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 border border-border rounded-md bg-surface-1">
      <span className="text-[13px] font-semibold text-primary-text">Table Columns</span>
      {columns.map((col, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          <span className="text-primary-text">{col.key}</span>
          <span className="text-text-secondary">"{col.header}"</span>
          <SmallButton
            variant="ghost"
            onClick={() =>
              onUpdate('table', { table: { columns: columns.filter((_, j) => j !== i) } })
            }
          >
            x
          </SmallButton>
        </div>
      ))}
      <div className="flex gap-1.5">
        <SmallInput
          placeholder="key"
          value={newCol.key}
          onChange={(e) => setNewCol((p) => ({ ...p, key: e.target.value }))}
          className="w-20"
        />
        <SmallInput
          placeholder="header"
          value={newCol.header}
          onChange={(e) => setNewCol((p) => ({ ...p, header: e.target.value }))}
          className="flex-1"
        />
        <SmallButton onClick={addColumn}>+ Add</SmallButton>
      </div>
    </div>
  );
}
