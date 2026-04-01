import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MdmaDocument, type MdmaRenderCustomizations } from '@mobile-reality/mdma-renderer-react';
import type { ChatMsg } from './types.js';
import {
  EditableFieldProvider,
  modifyFieldInMarkdown,
  type EditableFieldContextValue,
} from './EditableMessageContext.js';

export interface ChatMessageProps {
  message: ChatMsg;
  isStreaming: boolean;
  customizations?: MdmaRenderCustomizations;
  /** When set, the source view becomes an editable textarea with an Apply button. */
  onEditContent?: (msgId: number, content: string) => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isStreaming,
  customizations,
  onEditContent,
}: ChatMessageProps) {
  const [showSource, setShowSource] = useState(false);
  const [editDraft, setEditDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toggleSource = useCallback(() => {
    setShowSource((s) => {
      if (!s) setEditDraft(message.content); // sync draft when opening
      return !s;
    });
  }, [message.content]);

  const isEditable = !!onEditContent && message.role === 'assistant' && !isStreaming;
  const isDirty = showSource && editDraft !== message.content;

  const handleApply = useCallback(() => {
    if (onEditContent && isDirty) {
      onEditContent(message.id, editDraft);
    }
  }, [onEditContent, message.id, editDraft, isDirty]);

  const handleReset = useCallback(() => {
    setEditDraft(message.content);
  }, [message.content]);

  // Auto-resize textarea
  useEffect(() => {
    if (showSource && textareaRef.current) {
      const ta = textareaRef.current;
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [showSource, editDraft]);

  // ─── Editable field context (for inline component editing) ──────────────

  const dataSourceNames = useMemo(
    () => (customizations?.dataSources ? Object.keys(customizations.dataSources) : []),
    [customizations?.dataSources],
  );

  // Use a ref so the edit callback always sees the latest content
  const contentRef = useRef(message.content);
  contentRef.current = message.content;

  const editField = useCallback(
    (componentId: string, fieldName: string, changes: Record<string, string>) => {
      if (!onEditContent) return;
      const newContent = modifyFieldInMarkdown(contentRef.current, componentId, fieldName, changes);
      if (newContent !== contentRef.current) {
        onEditContent(message.id, newContent);
      }
    },
    [onEditContent, message.id],
  );

  const editableCtx = useMemo<EditableFieldContextValue | null>(
    () => (onEditContent ? { editField, dataSourceNames } : null),
    [onEditContent, editField, dataSourceNames],
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  const renderDocument = () => {
    if (!message.ast || !message.store) return null;
    const doc = (
      <MdmaDocument ast={message.ast} store={message.store} customizations={customizations} />
    );
    return editableCtx ? (
      <EditableFieldProvider value={editableCtx}>{doc}</EditableFieldProvider>
    ) : (
      doc
    );
  };

  return (
    <div className={`chat-msg chat-msg--${message.role}`}>
      <div className="chat-msg-header">
        <span className="chat-msg-label">{message.role === 'user' ? 'You' : 'MDMA AI'}</span>
        {message.role === 'assistant' && message.content && (
          <button
            type="button"
            className={`chat-msg-view-toggle ${showSource ? 'chat-msg-view-toggle--active' : ''}`}
            onClick={toggleSource}
          >
            {showSource ? 'Rendered' : 'Source'}
          </button>
        )}
      </div>
      <div className="chat-msg-body">
        {message.role === 'user' ? (
          <p>{message.content}</p>
        ) : showSource && message.content ? (
          isEditable ? (
            <div className="chat-msg-editor">
              <textarea
                ref={textareaRef}
                className="chat-msg-editor-textarea"
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                spellCheck={false}
              />
              <div className="chat-msg-editor-actions">
                {isDirty && (
                  <>
                    <button type="button" className="chat-msg-editor-apply" onClick={handleApply}>
                      Apply
                    </button>
                    <button type="button" className="chat-msg-editor-reset" onClick={handleReset}>
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <pre className="chat-msg-source">{message.content}</pre>
          )
        ) : message.ast && message.store ? (
          <>
            {renderDocument()}
            {isStreaming && <span className="chat-msg-streaming">Streaming...</span>}
          </>
        ) : message.content ? (
          <div className="chat-msg-parsing">
            <span className="chat-msg-typing">Parsing document...</span>
            <pre className="chat-msg-raw">{message.content}</pre>
          </div>
        ) : (
          <span className="chat-msg-typing">Generating...</span>
        )}
      </div>
    </div>
  );
});
