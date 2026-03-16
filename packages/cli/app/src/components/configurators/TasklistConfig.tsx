import { useState } from 'react';
import { SmallInput } from '../ui/SmallInput.js';
import { SmallButton } from '../ui/SmallButton.js';
import type { ComponentConfig, ComponentType } from '../../hooks/use-prompt-builder.js';

interface TasklistConfigProps {
  config: ComponentConfig;
  onUpdate: (type: ComponentType, update: Partial<ComponentConfig>) => void;
}

export function TasklistConfig({ config, onUpdate }: TasklistConfigProps) {
  const items = config.tasklist?.items ?? [];
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (!newItem) return;
    onUpdate('tasklist', { tasklist: { items: [...items, newItem] } });
    setNewItem('');
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 border border-border rounded-md bg-surface-1">
      <span className="text-[13px] font-semibold text-primary-text">Tasklist Items</span>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          <span className="text-text-primary">{item}</span>
          <SmallButton
            variant="ghost"
            onClick={() => onUpdate('tasklist', { tasklist: { items: items.filter((_, j) => j !== i) } })}
          >x</SmallButton>
        </div>
      ))}
      <div className="flex gap-1.5">
        <SmallInput
          placeholder="New task item"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          className="flex-1"
        />
        <SmallButton onClick={addItem}>+ Add</SmallButton>
      </div>
    </div>
  );
}
