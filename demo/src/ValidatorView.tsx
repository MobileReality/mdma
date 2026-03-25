import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useChat } from './chat/use-chat.js';
import { ChatSettings } from './chat/ChatSettings.js';
import { ChatMessage } from './chat/ChatMessage.js';
import { ChatInput } from './chat/ChatInput.js';
import { validate, type ValidationResult, type ValidationIssue } from '@mobile-reality/mdma-validator';
import { customizations } from './custom-components.js';
import { VALIDATOR_PROMPT_VARIANTS } from './validator-prompts.js';

function severityClass(severity: string): string {
  if (severity === 'error') return 'validator-severity--error';
  if (severity === 'warning') return 'validator-severity--warning';
  return 'validator-severity--info';
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  return (
    <div className={`validator-issue ${issue.fixed ? 'validator-issue--fixed' : ''}`}>
      <span className={`validator-severity ${severityClass(issue.severity)}`}>
        {issue.severity}
      </span>
      <span className="validator-issue-rule">{issue.ruleId}</span>
      {issue.componentId && (
        <span className="validator-issue-component">#{issue.componentId}</span>
      )}
      <span className="validator-issue-msg">{issue.message}</span>
      {issue.fixed && <span className="validator-issue-badge">fixed</span>}
    </div>
  );
}

function ValidationPanel({ results }: { results: Map<number, ValidationResult> }) {
  const entries = useMemo(
    () => Array.from(results.entries()).reverse(),
    [results],
  );

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
      {entries.map(([msgId, result]) => (
        <div key={msgId} className="validator-msg-result">
          <div className={`validator-summary ${result.ok ? 'validator-summary--ok' : 'validator-summary--fail'}`}>
            <span className="validator-summary-status">
              {result.ok ? 'PASS' : 'FAIL'}
            </span>
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
                <span className="validator-fix-count">
                  {result.fixCount} auto-fixed
                </span>
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

          {result.fixCount > 0 && (
            <div className="validator-output">
              <details>
                <summary className="validator-output-toggle">View fixed output</summary>
                <pre className="validator-output-pre">{result.output}</pre>
              </details>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ValidatorChatInner({ promptKey }: { promptKey: string }) {
  const variant = VALIDATOR_PROMPT_VARIANTS.find((v) => v.key === promptKey)!;

  const {
    config,
    messages,
    input,
    setInput,
    isGenerating,
    error,
    inputRef,
    updateConfig,
    applyPreset,
    send,
    stop,
    clear,
    updateMessage,
  } = useChat({
    systemPrompt: variant.prompt,
    storageKey: `validator-${promptKey}`,
    ...(customizations.schemas && { parserOptions: { customSchemas: customizations.schemas } }),
  });

  const [validationResults, setValidationResults] = useState<Map<number, ValidationResult>>(new Map());

  // Track which messages we've already validated
  const validatedRef = useRef<Set<number>>(new Set());

  // Auto-validate completed assistant messages and apply fixes
  useEffect(() => {
    if (isGenerating) return;
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.content && !validatedRef.current.has(msg.id)) {
        validatedRef.current.add(msg.id);
        const result = validate(msg.content);
        setValidationResults((prev) => {
          const next = new Map(prev);
          next.set(msg.id, result);
          return next;
        });

        // If fixes were applied, update the message so it re-parses and renders correctly
        if (result.fixCount > 0 && result.output !== msg.content) {
          updateMessage(msg.id, result.output);
        }
      }
    }
  }, [messages, isGenerating, updateMessage]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  const handleClear = useCallback(() => {
    clear();
    setValidationResults(new Map());
    validatedRef.current = new Set();
  }, [clear]);

  const lastMsgId = messages[messages.length - 1]?.id;

  return (
    <div className="validator-content">
      <div className="validator-chat-panel">
        <ChatSettings
          config={config}
          onUpdate={updateConfig}
          onPreset={applyPreset}
        />

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <p className="chat-empty-title">{variant.label}</p>
              <p className="chat-empty-hint">{variant.description}</p>
              <p className="chat-empty-hint" style={{ marginTop: '4px', fontSize: '12px', opacity: 0.7 }}>
                Rules tested: {variant.rules.join(', ')}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isStreaming={isGenerating && msg.id === lastMsgId}
              customizations={customizations}
            />
          ))}

          {error && <div className="chat-error">{error}</div>}

          <div ref={chatEndRef} />
        </div>

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={send}
          onStop={stop}
          onClear={handleClear}
          isGenerating={isGenerating}
          hasMessages={messages.length > 0}
          inputRef={inputRef}
        />
      </div>

      <ValidationPanel results={validationResults} />
    </div>
  );
}

export function ValidatorView() {
  const [activeVariant, setActiveVariant] = useState('all');

  return (
    <div className="validator-wrapper">
      <div className="validator-info">
        <strong>Validator</strong>
        <span>
          Chat with the AI — every response is automatically validated. Issues and auto-fixes appear on the right.
        </span>
      </div>

      <div className="validator-variant-selector">
        {VALIDATOR_PROMPT_VARIANTS.map((v) => (
          <button
            type="button"
            key={v.key}
            className={`validator-variant-btn ${activeVariant === v.key ? 'validator-variant-btn--active' : ''}`}
            onClick={() => setActiveVariant(v.key)}
            title={v.description}
          >
            {v.label}
          </button>
        ))}
      </div>

      <ValidatorChatInner key={activeVariant} promptKey={activeVariant} />
    </div>
  );
}
