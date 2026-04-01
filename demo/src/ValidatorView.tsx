import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useChat } from './chat/use-chat.js';
import { ChatSettings } from './chat/ChatSettings.js';
import { ChatMessage } from './chat/ChatMessage.js';
import { ChatInput } from './chat/ChatInput.js';
import { ChatActionLog } from './chat/ChatActionLog.js';
import { useChatActionLog } from './chat/use-chat-action-log.js';
import { validate, validateFlow, type ValidationResult, type ValidationIssue, type FlowValidationResult, type ValidationRuleId } from '@mobile-reality/mdma-validator';
import { buildFixerPrompt, buildFixerMessage, buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { chatCompletion } from './llm-client.js';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { customizations } from './custom-components.js';
import { VALIDATOR_PROMPT_VARIANTS, ALL_RULE_IDS, FIXER_FLOW_RULES, FIXER_CORRECT_STRUCTURE, FLOW_STEPS, SAMPLE_BINDING_DATA } from './validator-prompts.js';

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

interface ValidationPanelProps {
  results: Map<number, ValidationResult>;
  onRequestFix?: (msgId: number) => void;
  isGenerating?: boolean;
}

function ValidationPanel({ results, onRequestFix, isGenerating }: ValidationPanelProps) {
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
      {entries.map(([msgId, result]) => {
        const unfixedErrors = result.issues.filter((i) => !i.fixed && i.severity === 'error');
        const unfixedWarnings = result.issues.filter((i) => !i.fixed && i.severity === 'warning');
        const hasUnfixed = unfixedErrors.length > 0 || unfixedWarnings.length > 0;

        return (
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

            {hasUnfixed && onRequestFix && (
              <button
                type="button"
                className="validator-fix-btn"
                onClick={() => onRequestFix(msgId)}
                disabled={isGenerating}
              >
                {isGenerating ? 'Fixing...' : `Fix with LLM (${unfixedErrors.length + unfixedWarnings.length} issues)`}
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

function FlowProgressPanel({ steps, result }: {
  steps: import('@mobile-reality/mdma-validator').FlowStepDefinition[];
  result: FlowValidationResult | null;
}) {
  // Match issues to steps by "Step N" prefix
  const stepStatuses = steps.map((step, i) => {
    if (!result) return 'pending' as const;
    const stepPrefix = `Step ${i + 1} `;
    const matchingIssue = result.issues.find((iss) => iss.message.startsWith(stepPrefix));
    if (!matchingIssue) {
      // Check "not yet shown"
      const notShown = result.issues.find((iss) => iss.message.includes(step.id) && iss.message.includes('not yet shown'));
      return notShown ? 'pending' as const : 'pending' as const;
    }
    if (matchingIssue.severity === 'info' && matchingIssue.message.includes('correct')) return 'done' as const;
    if (matchingIssue.severity === 'error') return 'error' as const;
    return 'pending' as const;
  });

  const completedSteps = stepStatuses.filter((s) => s === 'done').length;

  return (
    <div className="flow-progress-panel">
      <h3>Flow Progress</h3>
      <div className="flow-steps">
        {steps.map((step, i) => {
          const status = stepStatuses[i];
          const stepPrefix = `Step ${i + 1} `;
          const issue = result?.issues.find((iss) => iss.message.startsWith(stepPrefix) && iss.severity === 'error');

          return (
            <div key={step.id} className={`flow-step flow-step--${status}`}>
              <span className="flow-step-num">{i + 1}</span>
              <span className="flow-step-label">{step.label}</span>
              <span className="flow-step-type">{step.type}#{step.id}</span>
              {status === 'done' && <span className="flow-step-badge flow-step-badge--done">done</span>}
              {status === 'error' && issue && (
                <span className="flow-step-badge flow-step-badge--error">{issue.message}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flow-progress-summary">
        {completedSteps}/{steps.length} steps completed
        {result && !result.ok && (
          <span className="validator-severity validator-severity--error" style={{ marginLeft: 8 }}>
            flow errors detected
          </span>
        )}
      </div>
    </div>
  );
}

function ValidatorChatInner({ promptKey }: { promptKey: string }) {
  const variant = VALIDATOR_PROMPT_VARIANTS.find((v) => v.key === promptKey)!;
  const variantRuleSet = useMemo(() => new Set(variant.rules), [variant.rules]);

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

  const [fixerModel, setFixerModel] = useState(() =>
    localStorage.getItem('mdma-fixer-model') || '',
  );
  const [customFixerModel, setCustomFixerModel] = useState(() =>
    localStorage.getItem('mdma-fixer-custom-model') || '',
  );
  const [autoFixWithLlm, setAutoFixWithLlm] = useState(() =>
    localStorage.getItem('mdma-auto-fix-llm') !== 'false',
  );

  const [validationResults, setValidationResults] = useState<Map<number, ValidationResult>>(new Map());

  // Subscribe to user-action events to auto-advance the conversation
  const subscribedStores = useRef(new Set<DocumentStore>());
  const pendingSendRef = useRef(false);
  const setInputRef = useRef(setInput);
  setInputRef.current = setInput;
  const flowCompleteRef = useRef(false);
  const [showFlowComplete, setShowFlowComplete] = useState(false);

  // Seed stores with sample binding data for the active variant
  const seededStores = useRef(new Set<DocumentStore>());
  useEffect(() => {
    const sampleData = SAMPLE_BINDING_DATA[promptKey];
    if (!sampleData) return;
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.store && !seededStores.current.has(msg.store)) {
        seededStores.current.add(msg.store);
        for (const [componentId, fields] of Object.entries(sampleData)) {
          for (const [field, value] of Object.entries(fields)) {
            msg.store.dispatch({ type: 'FIELD_CHANGED', componentId, field, value });
          }
        }
      }
    }
  }, [messages, promptKey]);

  useEffect(() => {
    const ADVANCE_EVENTS = ['ACTION_TRIGGERED', 'APPROVAL_GRANTED', 'APPROVAL_DENIED'] as const;
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.store && !subscribedStores.current.has(msg.store)) {
        subscribedStores.current.add(msg.store);
        for (const eventType of ADVANCE_EVENTS) {
          msg.store.getEventBus().on(eventType, () => {
            if (flowCompleteRef.current) {
              setShowFlowComplete(true);
              return;
            }
            setTimeout(() => {
              pendingSendRef.current = true;
              setInputRef.current('Continue to the next step');
            }, 500);
          });
        }
      }
    }
  }, [messages]);

  // Auto-send when pending action trigger sets the input
  useEffect(() => {
    if (pendingSendRef.current && input.trim() && !isGenerating) {
      pendingSendRef.current = false;
      send();
    }
  }, [input, isGenerating, send]);

  useEffect(() => {
    return () => { subscribedStores.current.clear(); };
  }, []);

  // Track which messages we've already validated
  const validatedRef = useRef<Set<number>>(new Set());

  // Auto-validate completed assistant messages and apply fixes
  useEffect(() => {
    if (isGenerating) return;
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.content && !validatedRef.current.has(msg.id)) {
        validatedRef.current.add(msg.id);

        // Collect component IDs from all prior assistant messages
        // so flow-ordering can detect regenerated steps
        const priorComponentIds: string[] = [];
        for (const prev of messages) {
          if (prev.id >= msg.id) break;
          if (prev.role !== 'assistant' || !prev.content) continue;
          const idMatches = prev.content.matchAll(/```mdma[\s\S]*?```/g);
          for (const match of idMatches) {
            const idMatch = match[0].match(/id:\s*(\S+)/);
            if (idMatch) priorComponentIds.push(idMatch[1]);
          }
        }

        // Only run the rules specified for this variant
        const excludeRules = ALL_RULE_IDS.filter((r) => !variantRuleSet.has(r));

        const result = validate(msg.content, {
          ...(priorComponentIds.length > 0 && { priorComponentIds }),
          ...(excludeRules.length > 0 && { exclude: excludeRules as ValidationRuleId[] }),
        });
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
  }, [messages, isGenerating, updateMessage, variantRuleSet]);

  const { events, isOpen: logOpen, setIsOpen: setLogOpen, clearEvents } = useChatActionLog(messages);

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
    clearEvents();
    setValidationResults(new Map());
    validatedRef.current = new Set();
  }, [clear, clearEvents]);

  const [fixingMsgId, setFixingMsgId] = useState<number | null>(null);
  const isFixing = fixingMsgId !== null;
  const fixAbortRef = useRef<AbortController | null>(null);

  const handleRequestFix = useCallback(async (msgId: number) => {
    const result = validationResults.get(msgId);
    const msg = messages.find((m) => m.id === msgId);
    if (!result || !msg || isFixing) return;

    const unfixed = result.issues.filter((i) => !i.fixed && (i.severity === 'error' || i.severity === 'warning'));
    if (unfixed.length === 0) return;

    setFixingMsgId(msgId);
    fixAbortRef.current = new AbortController();

    try {
      const systemPrompt = `${buildSystemPrompt()}\n\n---\n\n${buildFixerPrompt(promptKey)}`;

      // Build conversation history from messages before the broken one
      const history = messages
        .filter((m) => m.id < msgId)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const userMessage = buildFixerMessage(result.output, unfixed, {
        conversationHistory: history.length > 0 ? history : undefined,
        promptContext: FIXER_FLOW_RULES[promptKey] ?? FIXER_CORRECT_STRUCTURE[promptKey] ?? undefined,
      });

      const resolvedModel = fixerModel === '__custom__' ? customFixerModel : fixerModel;
      const fixerConfig = resolvedModel
        ? { ...config, model: resolvedModel }
        : config;

      const fixedContent = await chatCompletion(
        fixerConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        fixAbortRef.current.signal,
      );

      if (fixedContent) {
        // Overwrite the original message with the fixed content
        updateMessage(msg.id, fixedContent);
        // Clear old validation and seeded stores so they re-run on the new store
        validatedRef.current.delete(msg.id);
        seededStores.current.clear();
        setValidationResults((prev) => {
          const next = new Map(prev);
          next.delete(msg.id);
          return next;
        });
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        console.error('Fixer error:', err);
      }
    } finally {
      setFixingMsgId(null);
      fixAbortRef.current = null;
    }
  }, [validationResults, messages, config, isFixing, updateMessage, fixerModel, customFixerModel, promptKey]);

  // Auto-fix with LLM when enabled and unfixed issues detected
  const autoFixTriggeredRef = useRef<Set<number>>(new Set());
  const autoFixQueueRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoFixWithLlm || isFixing || isGenerating) return;
    for (const [msgId, result] of validationResults) {
      if (autoFixTriggeredRef.current.has(msgId)) continue;
      const unfixed = result.issues.filter((i) => !i.fixed && (i.severity === 'error' || i.severity === 'warning'));
      if (unfixed.length > 0) {
        autoFixTriggeredRef.current.add(msgId);
        autoFixQueueRef.current = msgId;
        break;
      }
    }
  }, [validationResults, autoFixWithLlm, isFixing, isGenerating]);

  // Process the queued auto-fix in a separate effect to avoid stale closures
  useEffect(() => {
    if (autoFixQueueRef.current === null || isFixing || isGenerating) return;
    const msgId = autoFixQueueRef.current;
    autoFixQueueRef.current = null;
    handleRequestFix(msgId);
  }, [isFixing, isGenerating, handleRequestFix]);

  // Flow validation — run against all assistant messages when steps are defined
  const flowSteps = FLOW_STEPS[promptKey];
  const flowResult = useMemo(() => {
    if (!flowSteps) return null;
    const assistantContents = messages
      .filter((m) => m.role === 'assistant' && m.content)
      .map((m) => m.content);
    if (assistantContents.length === 0) return null;
    return validateFlow(assistantContents, { steps: flowSteps });
  }, [flowSteps, messages]);

  // All flow steps completed — check by counting info "correct" issues
  const flowComplete = flowSteps != null && flowResult != null
    && flowResult.issues.filter((i) => i.severity === 'info' && i.message.includes('correct')).length >= flowSteps.length;

  flowCompleteRef.current = flowComplete;

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
            <div key={msg.id} className="validator-msg-wrapper">
              <ChatMessage
                message={msg}
                isStreaming={isGenerating && msg.id === lastMsgId}
                customizations={customizations}
              />
              {fixingMsgId === msg.id && (
                <div className="validator-fixing-overlay">
                  <div className="validator-fixing-spinner" />
                  <span>Fixing with LLM...</span>
                </div>
              )}
            </div>
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
          disabled={flowComplete}
          placeholder={flowComplete
            ? 'Flow completed — all steps validated successfully'
            : undefined}
        />
      </div>

      <ChatActionLog
        events={events}
        isOpen={logOpen}
        onToggle={() => setLogOpen((prev) => !prev)}
      />

      <div className="validator-side-panel">
        <div className="fixer-settings-panel">
          <h3>Fixer Settings</h3>
          <label className="fixer-settings-checkbox">
            <input
              type="checkbox"
              checked={autoFixWithLlm}
              onChange={(e) => {
                setAutoFixWithLlm(e.target.checked);
                localStorage.setItem('mdma-auto-fix-llm', String(e.target.checked));
              }}
            />
            <span>Fix automatically when issues detected</span>
          </label>
          <div className="fixer-settings-field">
            <span>Model</span>
            <select
              value={fixerModel}
              onChange={(e) => {
                setFixerModel(e.target.value);
                localStorage.setItem('mdma-fixer-model', e.target.value);
              }}
            >
              <option value="">Same as chat</option>
              <optgroup label="OpenAI">
                <option value="gpt-5.4">gpt-5.4</option>
                <option value="gpt-5.4-mini">gpt-5.4-mini</option>
                <option value="gpt-5.4-nano">gpt-5.4-nano</option>
                <option value="gpt-5.3-codex">gpt-5.3-codex</option>
                <option value="o3">o3</option>
                <option value="o3-pro">o3-pro</option>
                <option value="o4-mini">o4-mini</option>
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
              </optgroup>
              <optgroup label="Anthropic">
                <option value="claude-opus-4-6">claude-opus-4.6</option>
                <option value="claude-sonnet-4-6">claude-sonnet-4.6</option>
                <option value="claude-haiku-4-5-20251001">claude-haiku-4.5</option>
                <option value="claude-sonnet-4-5-20250929">claude-sonnet-4.5</option>
              </optgroup>
              <optgroup label="Google">
                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              </optgroup>
              <optgroup label="OpenRouter">
                <option value="openai/gpt-5.4">openai/gpt-5.4</option>
                <option value="openai/gpt-5.4-mini">openai/gpt-5.4-mini</option>
                <option value="anthropic/claude-opus-4-6">anthropic/claude-opus-4.6</option>
                <option value="anthropic/claude-sonnet-4-6">anthropic/claude-sonnet-4.6</option>
                <option value="google/gemini-2.5-pro">google/gemini-2.5-pro</option>
                <option value="google/gemini-2.5-flash">google/gemini-2.5-flash</option>
                <option value="meta-llama/llama-4-scout">meta-llama/llama-4-scout</option>
                <option value="deepseek/deepseek-r1">deepseek/deepseek-r1</option>
                <option value="qwen/qwen3-235b">qwen/qwen3-235b</option>
              </optgroup>
              <option value="__custom__">Custom model...</option>
            </select>
          </div>
          {fixerModel === '__custom__' && (
            <div className="fixer-settings-field">
              <span>Custom Model ID</span>
              <input
                type="text"
                value={customFixerModel}
                onChange={(e) => {
                  setCustomFixerModel(e.target.value);
                  localStorage.setItem('mdma-fixer-custom-model', e.target.value);
                }}
                placeholder="e.g. openrouter/auto"
              />
            </div>
          )}
        </div>

        {flowSteps && (
          <FlowProgressPanel steps={flowSteps} result={flowResult} />
        )}
        <ValidationPanel
          results={validationResults}
          onRequestFix={autoFixWithLlm ? undefined : handleRequestFix}
          isGenerating={isFixing || isGenerating}
        />
      </div>

      {showFlowComplete && (
        <div className="flow-complete-overlay" onClick={() => setShowFlowComplete(false)}>
          <div className="flow-complete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flow-complete-icon">&#10003;</div>
            <h2>Flow Completed!</h2>
            <p>All {flowSteps?.length} steps have been validated successfully.</p>
            <button
              type="button"
              className="flow-complete-btn"
              onClick={() => setShowFlowComplete(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ValidatorView() {
  const [activeVariant, setActiveVariant] = useState('structure');

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
