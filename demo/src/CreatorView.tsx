import { useRef, useEffect, useState, useCallback } from 'react';
import { useChat } from './chat/use-chat.js';
import { ChatSettings } from './chat/ChatSettings.js';
import { ChatInput } from './chat/ChatInput.js';
import { CreatorChatMessage } from './creator/CreatorChatMessage.js';
import { CreatorPanel } from './creator/CreatorPanel.js';
import { ApprovedComponentsList, type ApprovedComponent } from './creator/ApprovedComponentsList.js';
import { PromptGeneratorPanel } from './creator/PromptGeneratorPanel.js';
import { creatorCustomizations } from './creator/creator-customizations.js';
import { CREATOR_PROMPT, CREATOR_USER_SUFFIX } from './creator/creator-prompt.js';
import { splitAst } from './enterprise/split-ast.js';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';

type Phase = 'create' | 'generate-prompt';

const APPROVED_KEY = 'mdma-demo-creator-approved';

interface StoredApproved {
  id: string;
  label: string;
  markdown: string;
  componentType: string;
  msgId: number;
}

function loadApproved(): StoredApproved[] {
  try {
    const saved = localStorage.getItem(APPROVED_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

function saveApproved(components: ApprovedComponent[]) {
  const serializable: StoredApproved[] = components.map(
    ({ id, label, markdown, componentType, msgId }) => ({ id, label, markdown, componentType, msgId }),
  );
  localStorage.setItem(APPROVED_KEY, JSON.stringify(serializable));
}

/** Extract the first non-thinking ```mdma block content from a message. */
function extractMdmaBlock(content: string): string | null {
  const regex = /```mdma\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const yaml = match[1].trim();
    if (!/^\s*type:\s*thinking\b/m.test(yaml)) {
      return yaml;
    }
  }
  return null;
}

/** Extract the component type from the mdma YAML block. */
function extractComponentType(yaml: string): string {
  const match = yaml.match(/^\s*type:\s*(\S+)/m);
  return match ? match[1] : 'unknown';
}

/** Extract a short label from the chat text (first non-empty, non-thinking line). */
function extractLabel(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('```')) continue;
    if (trimmed.startsWith('type:') || trimmed.startsWith('id:') || trimmed.startsWith('content:')) continue;
    // Take the first meaningful text line, truncate
    const clean = trimmed.replace(/^#+\s*/, '').replace(/^\*+\s*/, '');
    if (clean.length > 0) return clean.length > 60 ? clean.slice(0, 57) + '...' : clean;
  }
  return 'Component';
}

interface CreatorViewProps {
  onTestPrompt?: () => void;
}

export function CreatorView({ onTestPrompt }: CreatorViewProps) {
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
  } = useChat({
    systemPrompt: CREATOR_PROMPT,
    userSuffix: CREATOR_USER_SUFFIX,
    storageKey: 'creator',
    parserOptions: creatorCustomizations.schemas
      ? { customSchemas: creatorCustomizations.schemas }
      : undefined,
  });

  const [panelAst, setPanelAst] = useState<MdmaRoot | null>(null);
  const [panelStore, setPanelStore] = useState<DocumentStore | null>(null);
  const [activeMsgId, setActiveMsgId] = useState<number | null>(null);
  const [hasPanel, setHasPanel] = useState(false);

  const [approvedComponents, setApprovedComponents] = useState<ApprovedComponent[]>(loadApproved);
  const [approvedMsgIds, setApprovedMsgIds] = useState<Set<number>>(() => {
    return new Set(loadApproved().map((c) => c.msgId));
  });
  const [phase, setPhase] = useState<Phase>('create');

  // Persist approved components
  useEffect(() => {
    saveApproved(approvedComponents);
    setApprovedMsgIds(new Set(approvedComponents.map((c) => c.msgId)));
  }, [approvedComponents]);

  const handlePanelUpdate = useCallback((msgId: number, ast: MdmaRoot, store: DocumentStore) => {
    if (ast.children.length === 0) return;
    setPanelAst(ast);
    setPanelStore(store);
    setActiveMsgId(msgId);
    setHasPanel(true);
  }, []);

  const handleSelectPanel = useCallback((msgId: number, ast: MdmaRoot, store: DocumentStore) => {
    setPanelAst(ast);
    setPanelStore(store);
    setActiveMsgId(msgId);
  }, []);

  // Approve the currently previewed component
  const handleApprove = useCallback(() => {
    if (!activeMsgId) return;
    const msg = messages.find((m) => m.id === activeMsgId);
    if (!msg || !msg.content) return;

    const mdmaBlock = extractMdmaBlock(msg.content);
    if (!mdmaBlock) return;

    const comp: ApprovedComponent = {
      id: crypto.randomUUID(),
      label: extractLabel(msg.content),
      markdown: mdmaBlock,
      componentType: extractComponentType(mdmaBlock),
      msgId: msg.id,
    };

    setApprovedComponents((prev) => [...prev, comp]);
  }, [activeMsgId, messages]);

  // Reject: focus input so user can type feedback
  const handleReject = useCallback(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  // Remove an approved component
  const handleRemove = useCallback((id: string) => {
    setApprovedComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Preview an approved component (re-select its message in panel)
  const handleSelectApproved = useCallback((comp: ApprovedComponent) => {
    const msg = messages.find((m) => m.id === comp.msgId);
    if (msg && msg.ast && msg.store) {
      const { panelAst: ast } = splitAst(msg.ast);
      if (ast.children.length > 0) {
        setPanelAst(ast);
        setPanelStore(msg.store);
        setActiveMsgId(msg.id);
      }
    }
  }, [messages]);

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
    setPanelAst(null);
    setPanelStore(null);
    setActiveMsgId(null);
    setHasPanel(false);
  }, [clear]);

  const lastMsgId = messages[messages.length - 1]?.id;

  return (
    <div className={`creator-layout ${hasPanel || phase === 'generate-prompt' ? 'creator-layout--split' : 'creator-layout--full'}`}>
      <div className="creator-chat">
        <ChatSettings
          config={config}
          onUpdate={updateConfig}
          onPreset={applyPreset}
        />

        <div className="creator-chat-messages">
          {messages.length === 0 && (
            <div className="creator-chat-empty">
              <p className="creator-chat-empty-title">Form Creator</p>
              <p className="creator-chat-empty-hint">
                Describe a component you need (form, table, chart, etc.) and the AI will generate it.
                Approve components to build your library, then generate a system prompt.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <CreatorChatMessage
              key={msg.id}
              message={msg}
              isStreaming={isGenerating && msg.id === lastMsgId}
              customizations={creatorCustomizations}
              onPanelUpdate={msg.id === lastMsgId ? handlePanelUpdate : undefined}
              onSelectPanel={handleSelectPanel}
              isActivePanel={activeMsgId === msg.id}
              isApproved={approvedMsgIds.has(msg.id)}
            />
          ))}

          {error && <div className="creator-chat-error">{error}</div>}
          <div ref={chatEndRef} />
        </div>

        <ApprovedComponentsList
          components={approvedComponents}
          onRemove={handleRemove}
          onSelect={handleSelectApproved}
          onGeneratePrompt={() => setPhase('generate-prompt')}
        />

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

      {phase === 'generate-prompt' ? (
        <PromptGeneratorPanel
          approvedComponents={approvedComponents}
          config={config}
          onBack={() => setPhase('create')}
          onTestPrompt={onTestPrompt ? () => onTestPrompt() : undefined}
        />
      ) : hasPanel ? (
        <CreatorPanel
          panelAst={panelAst}
          store={panelStore}
          customizations={creatorCustomizations}
          onApprove={handleApprove}
          onReject={handleReject}
          isApproved={activeMsgId !== null && approvedMsgIds.has(activeMsgId)}
          rawMarkdown={activeMsgId !== null ? messages.find((m) => m.id === activeMsgId)?.content : undefined}
        />
      ) : null}
    </div>
  );
}
