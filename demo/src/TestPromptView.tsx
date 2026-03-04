import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useChat } from './chat/use-chat.js';
import { ChatSettings } from './chat/ChatSettings.js';
import { ChatMessage } from './chat/ChatMessage.js';
import { ChatInput } from './chat/ChatInput.js';
import { validate, type ValidationResult, type ValidationIssue, type ValidatorOptions } from '@mobile-reality/mdma-validator';
import { customizations } from './custom-components.js';
import { TEST_PROMPT_KEY } from './creator/PromptGeneratorPanel.js';
import { parse as parseYaml } from 'yaml';

const APPROVED_KEY = 'mdma-demo-creator-approved';

/** Load approved components from localStorage and parse their markdown into reference blocks */
function loadApprovedAsReferences(): Record<string, unknown>[] {
  try {
    const saved = localStorage.getItem(APPROVED_KEY);
    if (!saved) return [];
    const approved = JSON.parse(saved) as Record<string, unknown>[];
    const refs: Record<string, unknown>[] = [];
    for (const item of approved) {
      const md = item.markdown as string | undefined;
      if (!md) continue;
      const blocks = parseReferenceBlocks(md);
      refs.push(...blocks);
    }
    return refs;
  } catch {
    return [];
  }
}

/**
 * Parse reference blocks from pasted text.
 * Supports:
 * - Multiple ```mdma fenced blocks
 * - Multiple bare YAML docs separated by --- on its own line
 * - Single bare YAML block
 */
function parseReferenceBlocks(input: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];

  // 1. Try extracting ```mdma fenced blocks
  const fenceRegex = /```mdma\n([\s\S]*?)```/g;
  let m;
  while ((m = fenceRegex.exec(input)) !== null) {
    try {
      const data = parseYaml(m[1]) as Record<string, unknown>;
      if (data && typeof data === 'object' && typeof data.type === 'string' && data.type !== 'thinking') {
        blocks.push(data);
      }
    } catch { /* skip */ }
  }
  if (blocks.length > 0) return blocks;

  // 2. Try splitting by YAML document separator (--- on its own line)
  const docs = input.split(/^---\s*$/m).filter((s) => s.trim());
  if (docs.length > 1) {
    for (const doc of docs) {
      try {
        const data = parseYaml(doc.trim()) as Record<string, unknown>;
        if (data && typeof data === 'object' && typeof data.type === 'string' && data.type !== 'thinking') {
          blocks.push(data);
        }
      } catch { /* skip */ }
    }
    if (blocks.length > 0) return blocks;
  }

  // 3. Try splitting by "type:" at the start of a line (multiple components concatenated)
  const typeChunks = input.split(/^(?=type:\s)/m).filter((s) => s.trim());
  if (typeChunks.length > 1) {
    for (const chunk of typeChunks) {
      try {
        const data = parseYaml(chunk.trim()) as Record<string, unknown>;
        if (data && typeof data === 'object' && typeof data.type === 'string' && data.type !== 'thinking') {
          blocks.push(data);
        }
      } catch { /* skip */ }
    }
    if (blocks.length > 0) return blocks;
  }

  // 4. Single bare YAML
  try {
    const data = parseYaml(input) as Record<string, unknown>;
    if (data && typeof data === 'object' && typeof data.type === 'string' && data.type !== 'thinking') {
      blocks.push(data);
    }
  } catch { /* skip */ }

  return blocks;
}

/** Build validator options with current references */
function buildOptions(references: Record<string, unknown>[]): ValidatorOptions {
  return {
    exclude: ['thinking-block'],
    references: references.length > 0 ? references : undefined,
  };
}

// ─── UI Components ──────────────────────────────────────────────────────────

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

function ResultBlock({ label, result }: { label: string; result: ValidationResult }) {
  return (
    <div className="validator-msg-result">
      <div className={`validator-summary ${result.ok ? 'validator-summary--ok' : 'validator-summary--fail'}`}>
        <span className="validator-summary-status">
          {result.ok ? 'PASS' : 'FAIL'}
        </span>
        <span className="validator-summary-label">{label}</span>
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
  );
}

/** Summarize a reference block for display */
function refLabel(ref: Record<string, unknown>): string {
  const type = ref.type as string;
  const id = typeof ref.id === 'string' ? ref.id : '';
  const fieldCount = Array.isArray(ref.fields) ? ref.fields.length : 0;
  const colCount = Array.isArray(ref.columns) ? ref.columns.length : 0;
  let detail = '';
  if (fieldCount) detail = `${fieldCount} field${fieldCount !== 1 ? 's' : ''}`;
  else if (colCount) detail = `${colCount} col${colCount !== 1 ? 's' : ''}`;
  return `${type}${id ? ` #${id}` : ''}${detail ? ` (${detail})` : ''}`;
}

interface ReferenceEditorProps {
  references: Record<string, unknown>[];
  onSetReference: (refs: Record<string, unknown>[]) => void;
}

function ReferenceEditor({ references, onSetReference }: ReferenceEditorProps) {
  const [pasteInput, setPasteInput] = useState('');
  const [parseError, setParseError] = useState('');

  const handleAdd = useCallback(() => {
    if (!pasteInput.trim()) return;
    const blocks = parseReferenceBlocks(pasteInput);
    if (blocks.length === 0) {
      setParseError('Could not parse any MDMA components. Paste bare YAML, ```mdma fenced blocks, or multiple blocks separated by ---');
      return;
    }
    setParseError('');
    onSetReference([...references, ...blocks]);
    setPasteInput('');
  }, [pasteInput, onSetReference, references]);

  const handleLoadFromCreator = useCallback(() => {
    const approved = loadApprovedAsReferences();
    if (approved.length === 0) {
      setParseError('No valid components found. Re-approve components in the Form Creator (old approvals stored thinking blocks).');
      return;
    }
    setParseError('');
    onSetReference([...references, ...approved]);
  }, [onSetReference, references]);

  const handleRemove = useCallback((index: number) => {
    onSetReference(references.filter((_, i) => i !== index));
  }, [onSetReference, references]);

  const handleClearAll = useCallback(() => {
    setPasteInput('');
    setParseError('');
    onSetReference([]);
  }, [onSetReference]);

  return (
    <div className="manual-validator">
      <div className="manual-validator-header">
        Reference Components
        {references.length > 0 && (
          <span className="manual-validator-badge">
            {references.length}
          </span>
        )}
      </div>

      {references.length > 0 && (
        <div className="ref-list">
          {references.map((ref, i) => (
            <div key={i} className="ref-card">
              <span className="ref-card-type">{ref.type as string}</span>
              <span className="ref-card-label">{refLabel(ref)}</span>
              <button
                type="button"
                className="ref-card-remove"
                onClick={() => handleRemove(i)}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className="manual-validator-clear-btn" onClick={handleClearAll}>
            Clear all
          </button>
        </div>
      )}

      {references.length === 0 && (
        <div className="ref-actions-row">
          <button type="button" className="ref-load-btn" onClick={handleLoadFromCreator}>
            Load from Creator
          </button>
          <span className="ref-actions-hint">or paste below</span>
        </div>
      )}

      <textarea
        className="manual-validator-textarea"
        value={pasteInput}
        onChange={(e) => { setPasteInput(e.target.value); setParseError(''); }}
        placeholder={"Paste MDMA component(s) here.\n\nSupports:\n• Bare YAML (single component)\n• Multiple components separated by ---\n• ```mdma fenced blocks"}
        spellCheck={false}
      />
      {parseError && <div className="ref-parse-error">{parseError}</div>}
      <div className="manual-validator-actions">
        <button
          type="button"
          className="manual-validator-run-btn"
          onClick={handleAdd}
          disabled={!pasteInput.trim()}
        >
          Add Reference{pasteInput.includes('---') || pasteInput.includes('```mdma') ? 's' : ''}
        </button>
        {references.length > 0 && (
          <button type="button" className="ref-load-btn" onClick={handleLoadFromCreator}>
            Load from Creator
          </button>
        )}
      </div>
    </div>
  );
}

function ValidationPanel({
  results,
  references,
  onSetReference,
}: {
  results: Map<number, ValidationResult>;
  references: Record<string, unknown>[];
  onSetReference: (refs: Record<string, unknown>[]) => void;
}) {
  const entries = useMemo(
    () => Array.from(results.entries()).reverse(),
    [results],
  );

  return (
    <div className="validator-results-panel">
      <ReferenceEditor references={references} onSetReference={onSetReference} />

      {entries.length === 0 ? (
        <div className="validator-empty">
          Chat validation results will appear here after the AI responds.
        </div>
      ) : (
        entries.map(([msgId, result]) => (
          <ResultBlock key={msgId} label={`msg #${msgId}`} result={result} />
        ))
      )}
    </div>
  );
}

// ─── Main View ──────────────────────────────────────────────────────────────

interface TestPromptViewProps {
  onBack: () => void;
}

export function TestPromptView({ onBack }: TestPromptViewProps) {
  const systemPrompt = localStorage.getItem(TEST_PROMPT_KEY) ?? undefined;

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
    systemPrompt,
    userSuffix: null,
    storageKey: 'test-prompt',
    ...(customizations.schemas && { parserOptions: { customSchemas: customizations.schemas } }),
  });

  // Reference templates — seeded from approved components, can be added to manually
  const [references, setReferences] = useState<Record<string, unknown>[]>(loadApprovedAsReferences);

  const [validationResults, setValidationResults] = useState<Map<number, ValidationResult>>(new Map());
  const validatedRef = useRef<Set<number>>(new Set());

  // Re-validate all messages when references change
  useEffect(() => {
    if (isGenerating) return;
    const opts = buildOptions(references);
    const newResults = new Map<number, ValidationResult>();
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.content) {
        const result = validate(msg.content, opts);
        newResults.set(msg.id, result);

        if (result.fixCount > 0 && result.output !== msg.content) {
          updateMessage(msg.id, result.output);
        }
      }
    }
    validatedRef.current = new Set(messages.filter((m) => m.role === 'assistant').map((m) => m.id));
    if (newResults.size > 0) {
      setValidationResults(newResults);
    }
  }, [references]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-validate new messages
  useEffect(() => {
    if (isGenerating) return;
    const opts = buildOptions(references);
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.content && !validatedRef.current.has(msg.id)) {
        validatedRef.current.add(msg.id);
        const result = validate(msg.content, opts);
        setValidationResults((prev) => {
          const next = new Map(prev);
          next.set(msg.id, result);
          return next;
        });

        if (result.fixCount > 0 && result.output !== msg.content) {
          updateMessage(msg.id, result.output);
        }
      }
    }
  }, [messages, isGenerating, updateMessage, references]);

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
    <div className="validator-wrapper">
      <div className="validator-info">
        <strong>Testing Generated Prompt</strong>
        <span>
          Paste the correct form as reference, then chat. Responses are validated and auto-fixed against your reference.{' '}
          <button type="button" className="creator-prompt-back-link" onClick={onBack}>
            Back to Creator
          </button>
        </span>
      </div>

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
                <p className="chat-empty-title">Test Prompt Chat</p>
                <p className="chat-empty-hint">
                  Paste the correct MDMA form as reference on the right, then chat with the AI.
                  Generated responses will be validated and auto-fixed against your reference.
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

        <ValidationPanel
          results={validationResults}
          references={references}
          onSetReference={setReferences}
        />
      </div>
    </div>
  );
}
