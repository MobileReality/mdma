import type { DomainConfig, TriggerMode } from '../hooks/use-prompt-builder.js';

interface DomainFormProps {
  domain: DomainConfig;
  onChange: (domain: DomainConfig) => void;
  onSample: () => void;
}

const TRIGGER_OPTIONS: { mode: TriggerMode; label: string; description: string }[] = [
  { mode: 'keyword', label: 'Keyword / Phrase', description: 'User says a specific word or phrase' },
  { mode: 'immediate', label: 'Immediate', description: 'Right when conversation starts' },
  { mode: 'contextual', label: 'Contextual', description: 'Based on conversation context' },
];

export function DomainForm({ domain, onChange, onSample }: DomainFormProps) {
  const update = (key: keyof DomainConfig, value: string) => {
    onChange({ ...domain, [key]: value });
  };

  const setTriggerMode = (mode: TriggerMode) => {
    onChange({ ...domain, triggerMode: mode, trigger: mode === 'immediate' ? '' : domain.trigger });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-sm font-semibold text-text-primary">Domain Context</h3>
        <button
          type="button"
          onClick={onSample}
          className="px-2.5 py-1 border border-border rounded bg-surface-1 text-primary text-xs font-medium cursor-pointer hover:bg-surface-2 transition-colors"
          title="Fill with random sample data"
        >
          Sample
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-secondary">Flow Name</span>
        <input
          type="text"
          value={domain.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g., kyc-verification"
          className="px-2.5 py-2 border border-border rounded-md bg-surface-2 text-text-primary text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-secondary">Domain</span>
        <input
          type="text"
          value={domain.domain}
          onChange={(e) => update('domain', e.target.value)}
          placeholder="e.g., finance, healthcare, engineering"
          className="px-2.5 py-2 border border-border rounded-md bg-surface-2 text-text-primary text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-secondary">Description</span>
        <textarea
          value={domain.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="What should this flow accomplish?"
          rows={3}
          className="px-2.5 py-2 border border-border rounded-md bg-surface-2 text-text-primary text-sm outline-none resize-y focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors font-[inherit]"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-secondary">Business Rules</span>
        <textarea
          value={domain.businessRules}
          onChange={(e) => update('businessRules', e.target.value)}
          placeholder="Constraints, requirements, compliance rules..."
          rows={3}
          className="px-2.5 py-2 border border-border rounded-md bg-surface-2 text-text-primary text-sm outline-none resize-y focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors font-[inherit]"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-secondary">When to Display</span>
        <div className="flex gap-1.5">
          {TRIGGER_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setTriggerMode(opt.mode)}
              title={opt.description}
              className={`
                flex-1 px-2.5 py-1.5 border rounded text-xs font-medium text-center cursor-pointer transition-colors
                ${domain.triggerMode === opt.mode
                  ? 'border-primary text-primary-text bg-primary-light'
                  : 'border-border text-text-secondary bg-surface-2 hover:bg-surface-3'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {domain.triggerMode === 'keyword' && (
          <input
            type="text"
            value={domain.trigger}
            onChange={(e) => update('trigger', e.target.value)}
            placeholder='e.g., "start KYC", "new incident", "onboard vendor"'
            className="px-2.5 py-2 border border-border rounded-md bg-surface-2 text-text-primary text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        )}

        {domain.triggerMode === 'immediate' && (
          <span className="text-[11px] text-text-muted italic">
            Components will be generated in the first response.
          </span>
        )}

        {domain.triggerMode === 'contextual' && (
          <textarea
            value={domain.trigger}
            onChange={(e) => update('trigger', e.target.value)}
            placeholder='Describe the situation, e.g., "After user provides customer name and issue description"'
            rows={3}
            className="px-2.5 py-2 border border-border rounded-md bg-surface-2 text-text-primary text-sm outline-none resize-y focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors font-[inherit]"
          />
        )}
      </div>
    </div>
  );
}
