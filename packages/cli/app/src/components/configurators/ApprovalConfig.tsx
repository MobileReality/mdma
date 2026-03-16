import { useState } from 'react';
import { SmallInput } from '../ui/SmallInput.js';
import { SmallButton } from '../ui/SmallButton.js';
import type { ComponentConfig, ComponentType } from '../../hooks/use-prompt-builder.js';

interface ApprovalConfigProps {
  config: ComponentConfig;
  onUpdate: (type: ComponentType, update: Partial<ComponentConfig>) => void;
}

export function ApprovalConfig({ config, onUpdate }: ApprovalConfigProps) {
  const ag = config.approvalGate ?? { roles: [], requiredApprovers: 1, requireReason: false };
  const [newRole, setNewRole] = useState('');

  const addRole = () => {
    if (!newRole) return;
    onUpdate('approval-gate', { approvalGate: { ...ag, roles: [...ag.roles, newRole] } });
    setNewRole('');
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 border border-border rounded-md bg-surface-1">
      <span className="text-[13px] font-semibold text-primary-text">Approval Gate</span>

      <div className="flex gap-1.5 flex-wrap">
        {ag.roles.map((r, i) => (
          <span key={i} className="bg-primary-light text-primary-text px-2 py-0.5 rounded text-[11px]">
            {r}
            <SmallButton
              variant="ghost"
              className="ml-1"
              onClick={() => onUpdate('approval-gate', { approvalGate: { ...ag, roles: ag.roles.filter((_, j) => j !== i) } })}
            >x</SmallButton>
          </span>
        ))}
      </div>

      <div className="flex gap-1.5 items-center">
        <SmallInput
          placeholder="role name"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addRole()}
        />
        <SmallButton onClick={addRole}>+ Role</SmallButton>
      </div>

      <label className="text-xs text-text-secondary flex items-center gap-2">
        Required approvers:
        <SmallInput
          type="number"
          min={1}
          value={ag.requiredApprovers}
          onChange={(e) => onUpdate('approval-gate', { approvalGate: { ...ag, requiredApprovers: Number(e.target.value) } })}
          className="w-12"
        />
      </label>

      <label className="text-xs text-text-secondary flex items-center gap-1">
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
