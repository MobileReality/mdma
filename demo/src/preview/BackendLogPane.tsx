import { useState } from 'react';
import { clearSubmissionLog, type SubmissionLogEntry } from './insurance-backend.js';
import { useSubmissionLog } from './use-submission-log.js';

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

export function BackendLogDrawer() {
  const entries = useSubmissionLog();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="preview-log-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>Backend log</span>
        <span className="preview-log-toggle-badge">{entries.length}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="preview-log-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Close backend log"
          />
          <aside className="preview-log-drawer" aria-label="Backend log">
            <div className="preview-log-drawer-header">
              <span className="preview-log-drawer-title">Backend log</span>
              <span className="preview-log-drawer-count">{entries.length}</span>
              {entries.length > 0 && (
                <button
                  type="button"
                  className="preview-log-clear"
                  onClick={clearSubmissionLog}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="preview-log-drawer-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="preview-log-drawer-body">
              {entries.length === 0 ? (
                <p className="preview-log-empty">
                  No submissions yet. Once the user submits a form, the mock backend response will
                  appear here.
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
            </div>
          </aside>
        </>
      )}
    </>
  );
}
