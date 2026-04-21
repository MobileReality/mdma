import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useChat } from './chat/use-chat.js';
import { ChatSettings } from './chat/ChatSettings.js';
import { ChatMessage } from './chat/ChatMessage.js';
import { ChatInput } from './chat/ChatInput.js';
import { ChatActionLog } from './chat/ChatActionLog.js';
import { useChatActionLog } from './chat/use-chat-action-log.js';
import { validateFlow, type FlowStepDefinition } from '@mobile-reality/mdma-validator';
import { customizations } from './custom-components.js';
import { VALIDATOR_PROMPT_VARIANTS, FLOW_STEPS } from './validator-prompts.js';
import { ValidationPanel } from './validator/ValidationPanel.js';
import { FlowProgressPanel } from './validator/FlowProgressPanel.js';
import { FixerSettings } from './validator/FixerSettings.js';
import { FlowCompleteModal } from './validator/FlowCompleteModal.js';
import { useValidation } from './validator/useValidation.js';
import { useLlmFixer } from './validator/useLlmFixer.js';
import { useFlowAutoAdvance } from './validator/useFlowAutoAdvance.js';

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

  // Validation
  const handleFixApplied = useCallback(
    (msgId: number, fixedOutput: string) => updateMessage(msgId, fixedOutput),
    [updateMessage],
  );

  const validation = useValidation({
    messages,
    isGenerating,
    promptKey,
    variantRules: variantRuleSet,
    onFixApplied: handleFixApplied,
  });

  // LLM Fixer
  const fixer = useLlmFixer({
    messages,
    config,
    promptKey,
    validationResults: validation.results,
    isGenerating,
    onFixed: (msgId, content) => {
      updateMessage(msgId, content);
      fixer.isFixing; // referenced for closure
    },
    onInvalidate: (msgId) => {
      validation.invalidate(msgId);
      flowAutoAdvance.clearSeededStores();
    },
  });

  // Flow validation
  const flowSteps = FLOW_STEPS[promptKey] as FlowStepDefinition[] | undefined;
  const flowResult = useMemo(() => {
    if (!flowSteps) return null;
    const assistantContents = messages
      .filter((m) => m.role === 'assistant' && m.content)
      .map((m) => m.content);
    if (assistantContents.length === 0) return null;
    return validateFlow(assistantContents, { steps: flowSteps });
  }, [flowSteps, messages]);

  const flowComplete =
    flowSteps != null &&
    flowResult != null &&
    flowResult.issues.filter((i) => i.severity === 'info' && i.message.includes('correct'))
      .length >= flowSteps.length;

  // Flow auto-advance
  const flowAutoAdvance = useFlowAutoAdvance({
    messages,
    promptKey,
    input,
    isGenerating,
    setInput,
    send,
    flowComplete,
  });

  // Action log
  const {
    events,
    isOpen: logOpen,
    setIsOpen: setLogOpen,
    clearEvents,
  } = useChatActionLog(messages);

  // Auto-scroll
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
    validation.clear();
  }, [clear, clearEvents, validation]);

  const lastMsgId = messages[messages.length - 1]?.id;

  return (
    <div className="validator-content">
      <div className="validator-chat-panel">
        <ChatSettings config={config} onUpdate={updateConfig} onPreset={applyPreset} />

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <p className="chat-empty-title">{variant.label}</p>
              <p className="chat-empty-hint">{variant.description}</p>
              <p
                className="chat-empty-hint"
                style={{ marginTop: '4px', fontSize: '12px', opacity: 0.7 }}
              >
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
              {fixer.fixingMsgId === msg.id && (
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
          placeholder={
            flowComplete ? 'Flow completed — all steps validated successfully' : undefined
          }
        />
      </div>

      <ChatActionLog
        events={events}
        isOpen={logOpen}
        onToggle={() => setLogOpen((prev) => !prev)}
      />

      <div className="validator-side-panel">
        <FixerSettings
          autoFixWithLlm={fixer.autoFixWithLlm}
          onAutoFixChange={fixer.updateAutoFix}
          fixerModel={fixer.fixerModel}
          onFixerModelChange={fixer.updateFixerModel}
          customFixerModel={fixer.customFixerModel}
          onCustomFixerModelChange={fixer.updateCustomFixerModel}
        />

        {flowSteps && <FlowProgressPanel steps={flowSteps} result={flowResult} />}
        <ValidationPanel
          results={validation.results}
          onRequestFix={fixer.autoFixWithLlm ? undefined : fixer.handleRequestFix}
          isGenerating={fixer.isFixing || isGenerating}
        />
      </div>

      {flowAutoAdvance.showFlowComplete && flowSteps && (
        <FlowCompleteModal
          stepCount={flowSteps.length}
          onClose={() => flowAutoAdvance.setShowFlowComplete(false)}
        />
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
          Chat with the AI — every response is automatically validated. Issues and auto-fixes appear
          on the right.
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
