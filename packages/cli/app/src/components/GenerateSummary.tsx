import type { DomainConfig, ComponentConfig } from '../hooks/use-prompt-builder.js';

interface GenerateSummaryProps {
  domain: DomainConfig;
  enabledComponents: ComponentConfig[];
}

export function GenerateSummary({ domain, enabledComponents }: GenerateSummaryProps) {
  const configurable = enabledComponents.filter((c) => c.type !== 'thinking');

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text-primary m-0">Summary</h3>
      <div className="text-xs text-text-secondary space-y-1">
        <p><span className="font-medium text-text-primary">Flow:</span> {domain.name || '(not set)'}</p>
        <p><span className="font-medium text-text-primary">Domain:</span> {domain.domain || '(not set)'}</p>
        <p><span className="font-medium text-text-primary">Trigger:</span> {domain.triggerMode}{domain.trigger ? ` \u2014 ${domain.trigger}` : ''}</p>
        <p>
          <span className="font-medium text-text-primary">Components:</span>{' '}
          {enabledComponents.length > 0
            ? enabledComponents.map((c) => c.type).join(', ')
            : '(none selected)'}
        </p>
      </div>
      {configurable.length > 0 && (
        <div className="text-xs text-text-muted mt-2">
          {configurable.map((c) => (
            <div key={c.type} className="py-1 border-b border-border-light last:border-0">
              <span className="font-medium text-primary-text">{c.type}</span>
              {c.type === 'form' && c.form && <span className="ml-1">\u2014 {c.form.fields.length} field(s)</span>}
              {c.type === 'table' && c.table && <span className="ml-1">\u2014 {c.table.columns.length} column(s)</span>}
              {c.type === 'tasklist' && c.tasklist && <span className="ml-1">\u2014 {c.tasklist.items.length} item(s)</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
