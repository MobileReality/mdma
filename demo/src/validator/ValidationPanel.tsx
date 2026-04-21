import { useMemo } from 'react';
import type { ValidationResult } from '@mobile-reality/mdma-validator';
import { IssueRow } from './IssueRow.js';

interface ValidationPanelProps {
  results: Map<number, ValidationResult>;
  onRequestFix?: (msgId: number) => void;
  isGenerating?: boolean;
}

export function ValidationPanel({ results, onRequestFix, isGenerating }: ValidationPanelProps) {
  const entries = useMemo(() => Array.from(results.entries()).reverse(), [results]);

  if (entries.length === 0) {
    return (
      <div className="validator-results-panel">
        <div className="validator-empty">
          Validation results will appear here after the AI responds.
        </div>
      </div>
    );
  }

  return (
    <div className="validator-results-panel">
      {entries.map(([msgId, result]) => {
        const unfixedErrors = result.issues.filter((i) => !i.fixed && i.severity === 'error');
        const unfixedWarnings = result.issues.filter((i) => !i.fixed && i.severity === 'warning');
        const hasUnfixed = unfixedErrors.length > 0 || unfixedWarnings.length > 0;

        return (
          <div key={msgId} className="validator-msg-result">
            <div
              className={`validator-summary ${result.ok ? 'validator-summary--ok' : 'validator-summary--fail'}`}
            >
              <span className="validator-summary-status">{result.ok ? 'PASS' : 'FAIL'}</span>
              <span className="validator-summary-label">msg #{msgId}</span>
              <span className="validator-summary-counts">
                {result.summary.errors > 0 && (
                  <span className="validator-severity validator-severity--error">
                    {result.summary.errors} error{result.summary.errors > 1 ? 's' : ''}
                  </span>
                )}
                {result.summary.warnings > 0 && (
                  <span className="validator-severity validator-severity--warning">
                    {result.summary.warnings} warning{result.summary.warnings > 1 ? 's' : ''}
                  </span>
                )}
                {result.summary.infos > 0 && (
                  <span className="validator-severity validator-severity--info">
                    {result.summary.infos} info{result.summary.infos > 1 ? 's' : ''}
                  </span>
                )}
                {result.fixCount > 0 && (
                  <span className="validator-fix-count">{result.fixCount} auto-fixed</span>
                )}
              </span>
            </div>

            {result.issues.length > 0 && (
              <div className="validator-issues">
                <h3>Issues ({result.issues.length})</h3>
                <div className="validator-issues-list">
                  {result.issues.map((issue, i) => (
                    <IssueRow key={i} issue={issue} />
                  ))}
                </div>
              </div>
            )}

            {hasUnfixed && onRequestFix && (
              <button
                type="button"
                className="validator-fix-btn"
                onClick={() => onRequestFix(msgId)}
                disabled={isGenerating}
              >
                {isGenerating
                  ? 'Fixing...'
                  : `Fix with LLM (${unfixedErrors.length + unfixedWarnings.length} issues)`}
              </button>
            )}

            {result.fixCount > 0 && (
              <div className="validator-output">
                <details>
                  <summary className="validator-output-toggle">View fixed output</summary>
                  <pre className="validator-output-pre">{result.output}</pre>
                </details>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
