import type {
  DataLoadingElementProps,
  DataErrorElementProps,
  DataEmptyElementProps,
} from '../context/ElementOverridesContext.js';

export function DefaultDataLoading({ componentId }: DataLoadingElementProps) {
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

export function DefaultDataEmpty({ componentId }: DataEmptyElementProps) {
  return (
    <div className="mdma-data-empty" data-component-id={componentId}>
      No data
    </div>
  );
}
