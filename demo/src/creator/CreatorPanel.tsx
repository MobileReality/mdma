import { memo, useState } from 'react';
import { MdmaDocument, type MdmaRenderCustomizations } from '@mdma/renderer-react';
import type { MdmaRoot } from '@mdma/spec';
import type { DocumentStore } from '@mdma/runtime';

export interface CreatorPanelProps {
  panelAst: MdmaRoot | null;
  store: DocumentStore | null;
  customizations?: MdmaRenderCustomizations;
  onApprove: () => void;
  onReject: () => void;
  isApproved: boolean;
  /** Raw markdown content of the active message (for source view). */
  rawMarkdown?: string;
}

export const CreatorPanel = memo(function CreatorPanel({
  panelAst,
  store,
  customizations,
  onApprove,
  onReject,
  isApproved,
  rawMarkdown,
}: CreatorPanelProps) {
  const [showRaw, setShowRaw] = useState(false);
  const hasContent = panelAst && panelAst.children.length > 0 && store;

  // Extract the non-thinking ```mdma block content for display
  const mdmaSource = (() => {
    if (!rawMarkdown) return '';
    const blocks = [...rawMarkdown.matchAll(/```mdma\n([\s\S]*?)```/g)];
    for (const m of blocks) {
      const content = m[1].trim();
      if (!/^\s*type:\s*thinking\b/m.test(content)) return content;
    }
    return blocks[0]?.[1]?.trim() ?? rawMarkdown;
  })();

  return (
    <div className="creator-panel">
      <div className="creator-panel-header">
        <span className="creator-panel-title">Component Preview</span>
        {hasContent && (
          <button
            type="button"
            className={`creator-panel-raw-toggle ${showRaw ? 'creator-panel-raw-toggle--active' : ''}`}
            onClick={() => setShowRaw((v) => !v)}
            title={showRaw ? 'Show rendered view' : 'Show MDMA source'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            {showRaw ? 'Preview' : 'Source'}
          </button>
        )}
      </div>

      <div className="creator-panel-content">
        {hasContent ? (
          showRaw ? (
            <pre className="creator-panel-source">{mdmaSource}</pre>
          ) : (
            <MdmaDocument
              ast={panelAst}
              store={store}
              customizations={customizations}
              className="creator-panel-document"
            />
          )
        ) : (
          <div className="creator-panel-empty">
            <div className="creator-panel-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <p className="creator-panel-empty-title">
              Component preview will appear here
            </p>
            <p className="creator-panel-empty-hint">
              Describe a component in the chat and the AI will generate it for you to preview.
            </p>
          </div>
        )}
      </div>

      {hasContent && (
        <div className="creator-panel-actions">
          {isApproved ? (
            <div className="creator-panel-approved-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Component Approved
            </div>
          ) : (
            <>
              <button
                type="button"
                className="creator-approve-btn"
                onClick={onApprove}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Approve
              </button>
              <button
                type="button"
                className="creator-reject-btn"
                onClick={onReject}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Reject
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});
