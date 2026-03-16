import type { DomainConfig } from '../hooks/use-prompt-builder.js';

interface DomainFormProps {
  domain: DomainConfig;
  onChange: (domain: DomainConfig) => void;
  onSample: () => void;
}

export function DomainForm({ domain, onChange, onSample }: DomainFormProps) {
  const update = (key: keyof DomainConfig, value: string) => {
    onChange({ ...domain, [key]: value });
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
    </div>
  );
}
