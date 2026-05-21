import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import { previewCustomizations } from './preview-customizations.js';
import type { PreviewState } from './use-preview-validation.js';

interface PreviewPanelProps {
  state: PreviewState;
}

const STATUS_LABELS: Record<PreviewState['status'], string> = {
  idle: 'idle',
  validating: 'validating',
  fixing: 'fixing',
  ready: 'ready',
  invalid: 'invalid',
};

const STATUS_CLASS: Record<PreviewState['status'], string> = {
  idle: 'preview-pane-status--idle',
  validating: 'preview-pane-status--validating',
  fixing: 'preview-pane-status--fixing',
  ready: 'preview-pane-status--ready',
  invalid: 'preview-pane-status--invalid',
};

export function PreviewPanel({ state }: PreviewPanelProps) {
  const { status, ast, store, unresolvedIssues, wasFixed, submitted } = state;
  const showRender = ast !== null && store !== null;

  const placeholder =
    !showRender && status === 'idle'
      ? {
          title: 'Insurance claim flow',
          hint: "Start the chat on the left. As the agent emits MDMA blocks, they'll be validated, auto-fixed if needed, and rendered here.",
        }
      : status === 'validating' || (status === 'fixing' && !showRender)
        ? {
            title: status === 'validating' ? 'Validating…' : 'Fixing with LLM…',
            hint:
              status === 'validating'
                ? "Checking the agent's MDMA against the spec."
                : "Calling the LLM fixer to repair the agent's output before rendering.",
          }
        : null;

  return (
    <div className="preview-pane">
      <div className="preview-pane-header">
        <span className="preview-pane-title">Live MDMA Preview</span>
        {submitted && (
          <span className="preview-pane-status preview-pane-status--submitted">submitted</span>
        )}
        <span className={`preview-pane-status ${STATUS_CLASS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      <div className="preview-pane-body">
        {placeholder ? (
          <div className="preview-pane-empty">
            <p className="preview-pane-empty-title">{placeholder.title}</p>
            <p className="preview-pane-empty-hint">{placeholder.hint}</p>
          </div>
        ) : (
          <>
            {wasFixed && status === 'ready' && (
              <div className="preview-pane-note preview-pane-note--fixed">
                Auto-fixed before render.
              </div>
            )}
            {status === 'invalid' && unresolvedIssues.length > 0 && (
              <div className="preview-pane-note preview-pane-note--invalid">
                <strong>{unresolvedIssues.length} unresolved issue(s):</strong>
                <ul>
                  {unresolvedIssues.slice(0, 3).map((i, idx) => (
                    <li key={idx}>
                      <code>{i.ruleId}</code> — {i.message}
                    </li>
                  ))}
                  {unresolvedIssues.length > 3 && <li>…and {unresolvedIssues.length - 3} more</li>}
                </ul>
              </div>
            )}
            {submitted && (
              <div className="preview-pane-note preview-pane-note--submitted">
                This step has already been submitted. Inputs are read-only — go back to the latest
                step from the chat to continue.
              </div>
            )}
            {showRender && (
              <div className={submitted ? 'preview-pane-locked' : undefined}>
                <MdmaDocument ast={ast} store={store} customizations={previewCustomizations} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
