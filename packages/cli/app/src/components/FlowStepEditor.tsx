import { useState } from 'react';
import { SmallInput } from './ui/SmallInput.js';
import { SmallButton } from './ui/SmallButton.js';
import type {
  FlowStep,
  StepTriggerMode,
  ComponentType,
  ComponentConfig,
  FormFieldConfig,
} from '../hooks/use-prompt-builder.js';

interface FlowStepEditorProps {
  flowSteps: FlowStep[];
  onChange: (steps: FlowStep[]) => void;
}

const TRIGGER_OPTIONS: { mode: StepTriggerMode; short: string; hint: string }[] = [
  { mode: 'immediate', short: 'Immediate', hint: 'Components appear in the first response' },
  { mode: 'keyword', short: 'Keyword', hint: 'When user says a keyword' },
  { mode: 'form-submit', short: 'Form Submit', hint: 'After form submission from previous step' },
  { mode: 'contextual', short: 'Contextual', hint: 'Based on conversation context' },
];

const ALL_COMPONENT_TYPES: { type: ComponentType; label: string }[] = [
  { type: 'form', label: 'Form' },
  { type: 'button', label: 'Button' },
  { type: 'tasklist', label: 'Tasklist' },
  { type: 'table', label: 'Table' },
  { type: 'callout', label: 'Callout' },
  { type: 'approval-gate', label: 'Approval Gate' },
  { type: 'webhook', label: 'Webhook' },
  { type: 'chart', label: 'Chart' },
  { type: 'thinking', label: 'Thinking' },
];

function newComponent(type: ComponentType): ComponentConfig {
  const base: ComponentConfig = { type, enabled: true };
  if (type === 'form') base.form = { fields: [] };
  if (type === 'tasklist') base.tasklist = { items: [] };
  if (type === 'table') base.table = { columns: [] };
  if (type === 'approval-gate') base.approvalGate = { roles: [], requiredApprovers: 1, requireReason: false };
  return base;
}

function emptyStep(index: number): FlowStep {
  return {
    label: `Step ${index + 1}`,
    triggerMode: index === 0 ? 'immediate' : 'form-submit',
    trigger: '',
    components: [],
    description: '',
  };
}

export function FlowStepEditor({ flowSteps, onChange }: FlowStepEditorProps) {
  const updateStep = (index: number, patch: Partial<FlowStep>) => {
    onChange(flowSteps.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addStep = () => onChange([...flowSteps, emptyStep(flowSteps.length)]);

  const removeStep = (index: number) => {
    if (flowSteps.length <= 1) return;
    onChange(flowSteps.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= flowSteps.length) return;
    const updated = [...flowSteps];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(updated);
  };

  const addComponent = (stepIndex: number, type: ComponentType) => {
    const step = flowSteps[stepIndex];
    updateStep(stepIndex, { components: [...step.components, newComponent(type)] });
  };

  const removeComponent = (stepIndex: number, compIndex: number) => {
    const step = flowSteps[stepIndex];
    updateStep(stepIndex, { components: step.components.filter((_, i) => i !== compIndex) });
  };

  const updateComponent = (stepIndex: number, compIndex: number, patch: Partial<ComponentConfig>) => {
    const step = flowSteps[stepIndex];
    const components = step.components.map((c, i) => (i === compIndex ? { ...c, ...patch } : c));
    updateStep(stepIndex, { components });
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 text-sm font-semibold text-text-primary">Conversation Flow</h3>
      <p className="text-xs text-text-muted m-0">
        Define each step of the conversation. Each step has its own trigger and components.
      </p>

      {flowSteps.map((step, i) => (
        <StepCard
          key={i}
          index={i}
          step={step}
          total={flowSteps.length}
          onUpdate={(patch) => updateStep(i, patch)}
          onMove={(dir) => moveStep(i, dir)}
          onRemove={() => removeStep(i)}
          onAddComponent={(type) => addComponent(i, type)}
          onRemoveComponent={(ci) => removeComponent(i, ci)}
          onUpdateComponent={(ci, patch) => updateComponent(i, ci, patch)}
        />
      ))}

      <SmallButton onClick={addStep} className="self-start">+ Add Step</SmallButton>
    </div>
  );
}

/* ── Step Card ── */

function StepCard({
  index,
  step,
  total,
  onUpdate,
  onMove,
  onRemove,
  onAddComponent,
  onRemoveComponent,
  onUpdateComponent,
}: {
  index: number;
  step: FlowStep;
  total: number;
  onUpdate: (patch: Partial<FlowStep>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onAddComponent: (type: ComponentType) => void;
  onRemoveComponent: (ci: number) => void;
  onUpdateComponent: (ci: number, patch: Partial<ComponentConfig>) => void;
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-surface-1">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <input
          type="text"
          value={step.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Step label..."
          className="flex-1 px-2 py-1 border border-border rounded bg-surface-2 text-text-primary text-xs outline-none focus:border-primary"
        />
        <div className="flex gap-0.5">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="px-1.5 py-0.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-30 bg-transparent border-none cursor-pointer">{'\u2191'}</button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="px-1.5 py-0.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-30 bg-transparent border-none cursor-pointer">{'\u2193'}</button>
          {total > 1 && (
            <button type="button" onClick={onRemove} className="px-1.5 py-0.5 text-xs text-text-muted hover:text-error bg-transparent border-none cursor-pointer">{'\u2715'}</button>
          )}
        </div>
      </div>

      {/* Trigger */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-text-secondary font-medium">Trigger</span>
        <div className="flex gap-1 flex-wrap">
          {TRIGGER_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => onUpdate({
                triggerMode: opt.mode,
                trigger: opt.mode === 'immediate' || opt.mode === 'form-submit' ? '' : step.trigger,
              })}
              title={opt.hint}
              className={`px-2 py-1 border rounded text-[10px] font-medium cursor-pointer transition-colors
                ${step.triggerMode === opt.mode
                  ? 'border-primary text-primary-text bg-primary-light'
                  : 'border-border text-text-secondary bg-surface-2 hover:bg-surface-3'}`}
            >
              {opt.short}
            </button>
          ))}
        </div>
        {step.triggerMode === 'keyword' && (
          <SmallInput value={step.trigger} onChange={(e) => onUpdate({ trigger: e.target.value })} placeholder='e.g., "start KYC", "new incident"' className="w-full" />
        )}
        {step.triggerMode === 'contextual' && (
          <textarea value={step.trigger} onChange={(e) => onUpdate({ trigger: e.target.value })} placeholder='e.g., "After user provides details..."' rows={2} className="px-2 py-1.5 border border-border rounded bg-surface-2 text-text-primary text-xs outline-none resize-y focus:border-primary font-[inherit]" />
        )}
        {step.triggerMode === 'form-submit' && <span className="text-[10px] text-text-muted italic">Triggered after form submission from previous step.</span>}
        {step.triggerMode === 'immediate' && <span className="text-[10px] text-text-muted italic">Components appear in the first response.</span>}
      </div>

      {/* Components */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-text-secondary font-medium">Components</span>
        {step.components.map((comp, ci) => (
          <StepComponentCard
            key={ci}
            comp={comp}
            onUpdate={(patch) => onUpdateComponent(ci, patch)}
            onRemove={() => onRemoveComponent(ci)}
          />
        ))}

        <div className="relative">
          <SmallButton onClick={() => setShowAddMenu((s) => !s)}>+ Add Component</SmallButton>
          {showAddMenu && (
            <div className="absolute z-10 mt-1 bg-surface-2 border border-border rounded-lg shadow-lg py-1 w-48">
              {ALL_COMPONENT_TYPES.map((ct) => (
                <button
                  key={ct.type}
                  type="button"
                  onClick={() => { onAddComponent(ct.type); setShowAddMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-surface-3 bg-transparent border-none cursor-pointer"
                >
                  {ct.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <textarea
        value={step.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        placeholder="Optional: describe what happens at this step..."
        rows={2}
        className="px-2 py-1.5 border border-border rounded bg-surface-2 text-text-primary text-xs outline-none resize-y focus:border-primary font-[inherit]"
      />
    </div>
  );
}

/* ── Component Card within a Step ── */

function StepComponentCard({
  comp,
  onUpdate,
  onRemove,
}: {
  comp: ComponentConfig;
  onUpdate: (patch: Partial<ComponentConfig>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded bg-surface-0 p-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setExpanded((e) => !e)} className="text-[10px] text-text-muted bg-transparent border-none cursor-pointer">{expanded ? '\u25BC' : '\u25B6'}</button>
        <span className="text-xs font-medium text-primary-text flex-1">{comp.type}</span>
        <SmallButton variant="ghost" onClick={onRemove}>{'\u2715'}</SmallButton>
      </div>

      {expanded && (
        <div className="mt-2">
          {comp.type === 'form' && <InlineFormConfig comp={comp} onUpdate={onUpdate} />}
          {comp.type === 'approval-gate' && <InlineApprovalConfig comp={comp} onUpdate={onUpdate} />}
          {comp.type === 'tasklist' && <InlineTasklistConfig comp={comp} onUpdate={onUpdate} />}
          {comp.type === 'table' && <InlineTableConfig comp={comp} onUpdate={onUpdate} />}
          {!['form', 'approval-gate', 'tasklist', 'table'].includes(comp.type) && (
            <span className="text-[10px] text-text-muted">No additional configuration needed.</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Inline Configurators ── */

function InlineFormConfig({ comp, onUpdate }: { comp: ComponentConfig; onUpdate: (p: Partial<ComponentConfig>) => void }) {
  const fields = comp.form?.fields ?? [];
  const [nf, setNf] = useState<FormFieldConfig>({ name: '', type: 'text', label: '', required: false, sensitive: false });

  const add = () => {
    if (!nf.name || !nf.label) return;
    onUpdate({ form: { fields: [...fields, { ...nf }] } });
    setNf({ name: '', type: 'text', label: '', required: false, sensitive: false });
  };

  return (
    <div className="flex flex-col gap-1.5">
      {fields.map((f, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[10px]">
          <span className="font-medium text-primary-text">{f.name}</span>
          <span className="text-text-muted">({f.type})</span>
          <span className="text-text-secondary">"{f.label}"</span>
          {f.required && <span className="text-warning">req</span>}
          {f.sensitive && <span className="text-error">PII</span>}
          <SmallButton variant="ghost" onClick={() => onUpdate({ form: { fields: fields.filter((_, j) => j !== i) } })}>x</SmallButton>
        </div>
      ))}
      <div className="flex gap-1 flex-wrap items-center">
        <SmallInput placeholder="name" value={nf.name} onChange={(e) => setNf((p) => ({ ...p, name: e.target.value }))} className="w-16" />
        <SmallInput placeholder="label" value={nf.label} onChange={(e) => setNf((p) => ({ ...p, label: e.target.value }))} className="w-20" />
        <select value={nf.type} onChange={(e) => setNf((p) => ({ ...p, type: e.target.value as FormFieldConfig['type'] }))} className="px-1 py-0.5 border border-border rounded bg-surface-2 text-text-primary text-[10px] outline-none">
          {['text', 'number', 'email', 'date', 'select', 'checkbox', 'textarea'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="text-[10px] text-text-secondary flex items-center gap-0.5"><input type="checkbox" checked={nf.required} onChange={(e) => setNf((p) => ({ ...p, required: e.target.checked }))} />req</label>
        <label className="text-[10px] text-text-secondary flex items-center gap-0.5"><input type="checkbox" checked={nf.sensitive} onChange={(e) => setNf((p) => ({ ...p, sensitive: e.target.checked }))} />PII</label>
        <SmallButton onClick={add}>+</SmallButton>
      </div>
    </div>
  );
}

function InlineApprovalConfig({ comp, onUpdate }: { comp: ComponentConfig; onUpdate: (p: Partial<ComponentConfig>) => void }) {
  const ag = comp.approvalGate ?? { roles: [], requiredApprovers: 1, requireReason: false };
  const [nr, setNr] = useState('');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1 flex-wrap">
        {ag.roles.map((r, i) => (
          <span key={i} className="bg-primary-light text-primary-text px-1.5 py-0.5 rounded text-[10px]">
            {r} <SmallButton variant="ghost" className="ml-0.5" onClick={() => onUpdate({ approvalGate: { ...ag, roles: ag.roles.filter((_, j) => j !== i) } })}>x</SmallButton>
          </span>
        ))}
      </div>
      <div className="flex gap-1 items-center">
        <SmallInput placeholder="role" value={nr} onChange={(e) => setNr(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && nr) { onUpdate({ approvalGate: { ...ag, roles: [...ag.roles, nr] } }); setNr(''); } }} className="w-24" />
        <SmallButton onClick={() => { if (nr) { onUpdate({ approvalGate: { ...ag, roles: [...ag.roles, nr] } }); setNr(''); } }}>+</SmallButton>
      </div>
      <span className="text-[10px] text-text-secondary flex items-center gap-1">Approvers: <SmallInput type="number" min={1} value={ag.requiredApprovers} onChange={(e) => onUpdate({ approvalGate: { ...ag, requiredApprovers: Number(e.target.value) } })} className="w-10" /></span>
      <label className="text-[10px] text-text-secondary flex items-center gap-1"><input type="checkbox" checked={ag.requireReason} onChange={(e) => onUpdate({ approvalGate: { ...ag, requireReason: e.target.checked } })} />Require reason on denial</label>
    </div>
  );
}

function InlineTasklistConfig({ comp, onUpdate }: { comp: ComponentConfig; onUpdate: (p: Partial<ComponentConfig>) => void }) {
  const items = comp.tasklist?.items ?? [];
  const [ni, setNi] = useState('');

  return (
    <div className="flex flex-col gap-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1 text-[10px]">
          <span className="text-text-primary">{item}</span>
          <SmallButton variant="ghost" onClick={() => onUpdate({ tasklist: { items: items.filter((_, j) => j !== i) } })}>x</SmallButton>
        </div>
      ))}
      <div className="flex gap-1">
        <SmallInput placeholder="New item" value={ni} onChange={(e) => setNi(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ni) { onUpdate({ tasklist: { items: [...items, ni] } }); setNi(''); } }} className="flex-1" />
        <SmallButton onClick={() => { if (ni) { onUpdate({ tasklist: { items: [...items, ni] } }); setNi(''); } }}>+</SmallButton>
      </div>
    </div>
  );
}

function InlineTableConfig({ comp, onUpdate }: { comp: ComponentConfig; onUpdate: (p: Partial<ComponentConfig>) => void }) {
  const cols = comp.table?.columns ?? [];
  const [nc, setNc] = useState({ key: '', header: '' });

  return (
    <div className="flex flex-col gap-1">
      {cols.map((col, i) => (
        <div key={i} className="flex items-center gap-1 text-[10px]">
          <span className="text-primary-text">{col.key}</span>
          <span className="text-text-secondary">"{col.header}"</span>
          <SmallButton variant="ghost" onClick={() => onUpdate({ table: { columns: cols.filter((_, j) => j !== i) } })}>x</SmallButton>
        </div>
      ))}
      <div className="flex gap-1">
        <SmallInput placeholder="key" value={nc.key} onChange={(e) => setNc((p) => ({ ...p, key: e.target.value }))} className="w-16" />
        <SmallInput placeholder="header" value={nc.header} onChange={(e) => setNc((p) => ({ ...p, header: e.target.value }))} className="flex-1" />
        <SmallButton onClick={() => { if (nc.key && nc.header) { onUpdate({ table: { columns: [...cols, { ...nc }] } }); setNc({ key: '', header: '' }); } }}>+</SmallButton>
      </div>
    </div>
  );
}
