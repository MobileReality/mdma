import { useRef, useEffect, useCallback, useState } from 'react';
import { useAgent } from './agent/use-agent.js';
import { AgentMessage } from './agent/AgentMessage.js';
import { AgentSettings } from './agent/AgentSettings.js';
import { ChatInput } from './chat/ChatInput.js';
import { BackendLogDrawer } from './preview/BackendLogPane.js';
import { PreviewPanel } from './preview/PreviewPanel.js';
import { clearSubmissionLog } from './preview/insurance-backend.js';
import { INSURANCE_FLOW_PROMPT } from './preview/insurance-flow-prompt.js';
import { useInsuranceFlow } from './preview/use-insurance-flow.js';
import { usePreviewValidation } from './preview/use-preview-validation.js';

function countToolUseBlocks(turns: ReturnType<typeof useAgent>['turns']): number {
  let count = 0;
  for (const turn of turns) {
    if (turn.role !== 'assistant') continue;
    for (const block of turn.blocks) if (block.type === 'tool_use') count++;
  }
  return count;
}

export function PreviewView() {
  const {
    turns,
    isGenerating,
    error,
    input,
    setInput,
    config,
    updateConfig,
    send,
    sendHidden,
    stop,
    clear,
    inputRef,
  } = useAgent({ flowPrompt: INSURANCE_FLOW_PROMPT, useAuthorSubAgent: true });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const previewState = usePreviewValidation({
    turns,
    selectedBlockId,
    agentConfig: config,
  });

  const insuranceFlow = useInsuranceFlow({
    currentStore: previewState.store,
    sendHidden,
    isGenerating,
  });

  // Snap back to the latest step whenever a new tool_use block appears so
  // the user doesn't get stuck viewing the previous step.
  const prevToolUseCountRef = useRef(0);
  useEffect(() => {
    const count = countToolUseBlocks(turns);
    if (count > prevToolUseCountRef.current) setSelectedBlockId(null);
    prevToolUseCountRef.current = count;
  }, [turns]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(turns.length);
  useEffect(() => {
    if (turns.length > prevCountRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = turns.length;
  }, [turns]);

  const handleClear = useCallback(() => {
    clear();
    setSelectedBlockId(null);
    clearSubmissionLog();
    insuranceFlow.reset();
  }, [clear, insuranceFlow]);

  return (
    <div className="preview-layout">
      <div className="preview-chat">
        <AgentSettings config={config} onUpdate={updateConfig} />

        <div className="chat-messages">
          {turns.length === 0 && (
            <div className="chat-empty">
              <p className="chat-empty-title">Insurance Claim Demo</p>
              <p className="chat-empty-hint">
                Ask the agent to start a new insurance claim. It will walk you through name &amp;
                birthday, claim details, bank account, and a final confirmation — each step
                rendered live in the preview pane on the right.
              </p>
            </div>
          )}

          {turns.map((turn) => (
            <AgentMessage
              key={turn.id}
              turn={turn}
              compactToolUse
              activeToolUseId={previewState.blockId}
              onSelectToolUse={setSelectedBlockId}
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
          hasMessages={turns.length > 0}
          inputRef={inputRef}
        />
      </div>

      <PreviewPanel state={previewState} />

      <BackendLogDrawer />
    </div>
  );
}
