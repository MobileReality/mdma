import { useState } from 'react';
import { clearSubmissionLog, type SubmissionLogEntry } from './insurance-backend.js';

interface BackendLogPaneProps {
  entries: readonly SubmissionLogEntry[];
}

const STEP_LABEL: Record<SubmissionLogEntry['step'], string> = {
  'personal-info': 'POST /claims',
  claim: 'POST /claims/:id/description',
  bank: 'POST /claims/:id/bank',
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function BackendLogPane({ entries }: BackendLogPaneProps) {
  const [open, setOpen] = useState(true);

  return (
    <details className="preview-log" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="preview-log-summary">
        <span className="preview-log-title">Backend log</span>
        <span className="preview-log-count">{entries.length}</span>
        {entries.length > 0 && (
          <button
            type="button"
            className="preview-log-clear"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              clearSubmissionLog();
            }}
          >
            Clear
          </button>
        )}
      </summary>
      {entries.length === 0 ? (
        <p className="preview-log-empty">
          No submissions yet. Once the user submits a form, the mock backend response will appear
          here.
        </p>
      ) : (
        <ol className="preview-log-list">
          {entries.map((entry, i) => (
            <li key={i} className="preview-log-item">
              <div className="preview-log-item-meta">
                <span className="preview-log-item-method">{STEP_LABEL[entry.step]}</span>
                <span className="preview-log-item-status">200 OK</span>
                <span className="preview-log-item-time">{formatTime(entry.at)}</span>
              </div>
              <div className="preview-log-item-body">
                <code className="preview-log-item-claim">{entry.claimId}</code>
                <span className="preview-log-item-summary">{entry.summary}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}
