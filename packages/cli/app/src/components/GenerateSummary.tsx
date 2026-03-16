import type { DomainConfig } from '../hooks/use-prompt-builder.js';

interface GenerateSummaryProps {
  domain: DomainConfig;
}

export function GenerateSummary({ domain }: GenerateSummaryProps) {
  const allTypes = new Set<string>();
  for (const step of domain.flowSteps) {
    for (const comp of step.components) {
      if (comp.enabled) allTypes.add(comp.type);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text-primary m-0">Summary</h3>
      <div className="text-xs text-text-secondary space-y-1">
        <p><span className="font-medium text-text-primary">Flow:</span> {domain.name || '(not set)'}</p>
        <p><span className="font-medium text-text-primary">Domain:</span> {domain.domain || '(not set)'}</p>
        <p>
          <span className="font-medium text-text-primary">Components:</span>{' '}
          {allTypes.size > 0 ? [...allTypes].join(', ') : '(none)'}
        </p>
      </div>

      {domain.flowSteps.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          <span className="text-xs font-medium text-text-primary">
            Conversation Flow ({domain.flowSteps.length} step{domain.flowSteps.length > 1 ? 's' : ''})
          </span>
          {domain.flowSteps.map((step, i) => {
            const stepTypes = step.components.filter((c) => c.enabled).map((c) => c.type);
            return (
              <div key={i} className="text-xs text-text-muted py-1 border-b border-border-light last:border-0">
                <span className="font-medium text-primary-text">{i + 1}. {step.label || `Step ${i + 1}`}</span>
                <span className="ml-1 text-text-secondary">({step.triggerMode})</span>
                {stepTypes.length > 0 && (
                  <span className="ml-1">{'\u2014'} {stepTypes.join(', ')}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
