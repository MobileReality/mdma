import type {
  DataLoadingElementProps,
  DataErrorElementProps,
  DataEmptyElementProps,
} from '../context/ElementOverridesContext.js';

export function DefaultDataLoading({ componentId, reloading }: DataLoadingElementProps) {
  if (reloading) {
    return (
      <span className="mdma-table-loading-indicator" data-component-id={componentId}>
        Loading…
      </span>
    );
  }
  return (
    <div className="mdma-data-loading" data-component-id={componentId}>
      Loading…
    </div>
  );
}

export function DefaultDataError({ componentId, error, onRetry }: DataErrorElementProps) {
  return (
    <div className="mdma-data-error" data-component-id={componentId}>
      <span>{error}</span>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export function DefaultDataEmpty({ componentId, label }: DataEmptyElementProps) {
  return (
    <div className="mdma-data-empty" data-component-id={componentId}>
      {label && <div className="mdma-chart-label">{label}</div>}
      No data
    </div>
  );
}
