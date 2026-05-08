import { useState, useCallback, useRef, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { buildSystemPrompt, getAuthorPromptVariant, getAgentToolPromptVariant } from '@mobile-reality/mdma-prompt-pack';
import {
  streamAgentMessages,
  type AnthropicConfig,
  type ApiMessage,
  type ApiAssistantBlock,
} from './anthropic-client.js';
import {
  streamOpenAIAgentMessages,
  type OpenAIMessage,
  type OpenAIAssistantMessage,
} from './openai-agent-client.js';
import { parseMarkdown } from '../chat/parse-markdown.js';
import type { AgentDisplayTurn, AssistantTurn, AgentBlock } from './types.js';

// ── Tool definition ──────────────────────────────────────────────────────────

const GENERATE_MDMA_TOOL = {
  name: 'generate_mdma',
  description:
    'Generate an MDMA Markdown document to present structured interactive content to the user. ' +
    'Use this to create forms, tables, checklists, approval gates, charts, callouts, and any other ' +
    'interactive UI components described in the MDMA spec.',
  input_schema: {
    type: 'object' as const,
    properties: {
      document: {
        type: 'string',
        description: 'The complete MDMA Markdown document.',
      },
    },
    required: ['document'],
  },
};


// ── Config persistence ───────────────────────────────────────────────────────

const CONFIG_KEY = 'mdma-agent-config';

const DEFAULT_CONFIG: AnthropicConfig = {
  provider: 'anthropic',
  apiKey: '',
  model: 'claude-sonnet-4-6',
  thinkingBudget: 8000,
};

function loadConfig(): AnthropicConfig {
  try {
    const s = localStorage.getItem(CONFIG_KEY);
    if (s) return { ...DEFAULT_CONFIG, ...JSON.parse(s) };
  } catch {
    /* ignore */
  }
  return DEFAULT_CONFIG;
}

function saveConfig(c: AnthropicConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
}

// ── History persistence ───────────────────────────────────────────────────────

const HISTORY_KEY = 'mdma-agent-history';

interface StoredAgentHistory {
  turns: AgentDisplayTurn[];
  apiHistory: ApiMessage[];
  openaiHistory: OpenAIMessage[];
  maxId: number;
}

function saveAgentHistory(
  turns: AgentDisplayTurn[],
  apiHistory: ApiMessage[],
  openaiHistory: OpenAIMessage[],
) {
  try {
    const stripped = turns.map((turn) => {
      if (turn.role === 'user') return turn;
      return {
        ...turn,
        blocks: (turn as AssistantTurn).blocks.map((block) =>
          block.type === 'tool_use'
            ? { ...block, ast: null, store: null, isStreaming: false }
            : { ...block, isStreaming: false },
        ),
      };
    });
    const maxId = turns.reduce((max, t) => Math.max(max, Number.parseInt(t.id, 10) || 0), 0);
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({ turns: stripped, apiHistory, openaiHistory, maxId }),
    );
  } catch {
    /* ignore */
  }
}

function loadAgentHistory(): StoredAgentHistory | null {
  try {
    const s = localStorage.getItem(HISTORY_KEY);
    if (s) return JSON.parse(s) as StoredAgentHistory;
  } catch {
    /* ignore */
  }
  return null;
}

function clearAgentHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// ── Per-block streaming metadata ─────────────────────────────────────────────

interface BlockMeta {
  displayId: string;
  apiBlock: ApiAssistantBlock;
  partialJson?: string;
}

// ── Anthropic agentic loop ────────────────────────────────────────────────────

async function runAgentLoop(
  config: AnthropicConfig,
  systemPrompt: string,
  history: ApiMessage[],
  assistantTurnId: string,
  signal: AbortSignal,
  setTurns: Dispatch<SetStateAction<AgentDisplayTurn[]>>,
  onError: (msg: string) => void,
  nextId: () => string,
): Promise<void> {
  let continueLoop = true;

  while (continueLoop && !signal.aborted) {
    const currentApiBlocks: ApiAssistantBlock[] = [];
    const blockMeta = new Map<number, BlockMeta>();
    let stopReason = 'end_turn';

    for await (const ev of streamAgentMessages(config, systemPrompt, history, [GENERATE_MDMA_TOOL], signal)) {
      if (ev.type === 'stream_error') {
        onError(ev.message);
        continueLoop = false;
        break;
      }

      if (ev.type === 'block_start') {
        const displayId = nextId();

        if (ev.blockType === 'thinking') {
          const apiBlock: ApiAssistantBlock = { type: 'thinking', thinking: '', signature: '' };
          currentApiBlocks.push(apiBlock);
          blockMeta.set(ev.index, { displayId, apiBlock });
          setTurns((prev) => appendBlock(prev, assistantTurnId, {
            id: displayId, type: 'thinking', content: '', isStreaming: true,
          } satisfies AgentBlock));
        } else if (ev.blockType === 'text') {
          const apiBlock: ApiAssistantBlock = { type: 'text', text: '' };
          currentApiBlocks.push(apiBlock);
          blockMeta.set(ev.index, { displayId, apiBlock });
          setTurns((prev) => appendBlock(prev, assistantTurnId, {
            id: displayId, type: 'text', content: '', isStreaming: true,
          } satisfies AgentBlock));
        } else if (ev.blockType === 'tool_use') {
          const toolUseId = ev.toolUseId!;
          const toolName = ev.toolName!;
          const apiBlock: ApiAssistantBlock = { type: 'tool_use', id: toolUseId, name: toolName, input: {} };
          currentApiBlocks.push(apiBlock);
          blockMeta.set(ev.index, { displayId, apiBlock, partialJson: '' });
          setTurns((prev) => appendBlock(prev, assistantTurnId, {
            id: displayId, type: 'tool_use', toolUseId, name: toolName,
            document: '', ast: null, store: null, isStreaming: true,
          } satisfies AgentBlock));
        }
      }

      if (ev.type === 'thinking_delta') {
        const meta = blockMeta.get(ev.index);
        if (meta?.apiBlock.type === 'thinking') {
          meta.apiBlock.thinking += ev.thinking;
          const snap = meta.apiBlock.thinking;
          setTurns((prev) => patchBlock(prev, assistantTurnId, meta.displayId, { content: snap }));
        }
      }

      if (ev.type === 'signature_delta') {
        const meta = blockMeta.get(ev.index);
        if (meta?.apiBlock.type === 'thinking') {
          meta.apiBlock.signature = ev.signature;
        }
      }

      if (ev.type === 'text_delta') {
        const meta = blockMeta.get(ev.index);
        if (meta?.apiBlock.type === 'text') {
          meta.apiBlock.text += ev.text;
          const snap = meta.apiBlock.text;
          setTurns((prev) => patchBlock(prev, assistantTurnId, meta.displayId, { content: snap }));
        }
      }

      if (ev.type === 'input_json_delta') {
        const meta = blockMeta.get(ev.index);
        if (meta?.partialJson !== undefined) {
          meta.partialJson += ev.partial_json;
        }
      }

      if (ev.type === 'block_stop') {
        const meta = blockMeta.get(ev.index);
        if (!meta) continue;

        if (meta.partialJson !== undefined) {
          let document = '';
          try {
            const parsed = JSON.parse(meta.partialJson) as { document?: string };
            document = parsed.document ?? '';
          } catch {
            document = meta.partialJson;
          }
          if (meta.apiBlock.type === 'tool_use') meta.apiBlock.input = { document };

          const parsed = await parseMarkdown(document).catch(() => null);
          const ast = parsed?.ast ?? null;
          const store = parsed?.store ?? null;
          setTurns((prev) => patchBlock(prev, assistantTurnId, meta.displayId, { document, ast, store, isStreaming: false }));
        } else {
          setTurns((prev) => patchBlock(prev, assistantTurnId, meta.displayId, { isStreaming: false }));
        }
      }

      if (ev.type === 'message_stop') stopReason = ev.stop_reason;
    }

    if (signal.aborted) break;

    history.push({ role: 'assistant', content: currentApiBlocks });

    if (stopReason === 'tool_use') {
      const toolResults = currentApiBlocks
        .filter((b): b is Extract<ApiAssistantBlock, { type: 'tool_use' }> => b.type === 'tool_use')
        .map((b) => ({ type: 'tool_result' as const, tool_use_id: b.id, content: 'Document rendered successfully.' }));
      if (toolResults.length > 0) history.push({ role: 'user', content: toolResults });
    } else {
      continueLoop = false;
    }
  }
}

// ── OpenAI agentic loop ───────────────────────────────────────────────────────

async function runOpenAIAgentLoop(
  config: AnthropicConfig,
  systemPrompt: string,
  history: OpenAIMessage[],
  assistantTurnId: string,
  signal: AbortSignal,
  setTurns: Dispatch<SetStateAction<AgentDisplayTurn[]>>,
  onError: (msg: string) => void,
  nextId: () => string,
): Promise<void> {
  let continueLoop = true;

  while (continueLoop && !signal.aborted) {
    const blockMeta = new Map<number, BlockMeta>();
    let stopReason = 'end_turn';
    // Track data needed to build the OpenAI-format assistant message for history
    let finishedTextContent = '';
    const finishedToolCalls: Array<{ id: string; name: string; arguments: string }> = [];

    for await (const ev of streamOpenAIAgentMessages(
      config.openaiApiKey ?? '', config.model, systemPrompt, history, [GENERATE_MDMA_TOOL], signal,
    )) {
      if (ev.type === 'stream_error') {
        onError(ev.message);
        continueLoop = false;
        break;
      }

      if (ev.type === 'block_start') {
        const displayId = nextId();
        if (ev.blockType === 'text') {
          const apiBlock: ApiAssistantBlock = { type: 'text', text: '' };
          blockMeta.set(ev.index, { displayId, apiBlock });
          setTurns((prev) => appendBlock(prev, assistantTurnId, {
            id: displayId, type: 'text', content: '', isStreaming: true,
          } satisfies AgentBlock));
        } else if (ev.blockType === 'tool_use') {
          const toolUseId = ev.toolUseId!;
          const toolName = ev.toolName!;
          const apiBlock: ApiAssistantBlock = { type: 'tool_use', id: toolUseId, name: toolName, input: {} };
          blockMeta.set(ev.index, { displayId, apiBlock, partialJson: '' });
          setTurns((prev) => appendBlock(prev, assistantTurnId, {
            id: displayId, type: 'tool_use', toolUseId, name: toolName,
            document: '', ast: null, store: null, isStreaming: true,
          } satisfies AgentBlock));
        }
      }

      if (ev.type === 'text_delta') {
        const meta = blockMeta.get(ev.index);
        if (meta?.apiBlock.type === 'text') {
          meta.apiBlock.text += ev.text;
          finishedTextContent = meta.apiBlock.text;
          const snap = meta.apiBlock.text;
          setTurns((prev) => patchBlock(prev, assistantTurnId, meta.displayId, { content: snap }));
        }
      }

      if (ev.type === 'input_json_delta') {
        const meta = blockMeta.get(ev.index);
        if (meta?.partialJson !== undefined) meta.partialJson += ev.partial_json;
      }

      if (ev.type === 'block_stop') {
        const meta = blockMeta.get(ev.index);
        if (!meta) continue;

        if (meta.partialJson !== undefined) {
          let document = '';
          try {
            const parsed = JSON.parse(meta.partialJson) as { document?: string };
            document = parsed.document ?? '';
          } catch {
            document = meta.partialJson;
          }
          if (meta.apiBlock.type === 'tool_use') {
            meta.apiBlock.input = { document };
            finishedToolCalls.push({ id: meta.apiBlock.id, name: meta.apiBlock.name, arguments: meta.partialJson });
          }

          const parsed = await parseMarkdown(document).catch(() => null);
          setTurns((prev) => patchBlock(prev, assistantTurnId, meta.displayId, {
            document, ast: parsed?.ast ?? null, store: parsed?.store ?? null, isStreaming: false,
          }));
        } else {
          setTurns((prev) => patchBlock(prev, assistantTurnId, meta.displayId, { isStreaming: false }));
        }
      }

      if (ev.type === 'message_stop') stopReason = ev.stop_reason;
    }

    if (signal.aborted) break;

    // Push OpenAI-formatted assistant message
    const assistantMsg: OpenAIAssistantMessage = {
      role: 'assistant',
      content: finishedTextContent || null,
    };
    if (finishedToolCalls.length > 0) {
      assistantMsg.tool_calls = finishedToolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.arguments },
      }));
    }
    history.push(assistantMsg);

    if (stopReason === 'tool_use') {
      for (const tc of finishedToolCalls) {
        history.push({ role: 'tool', tool_call_id: tc.id, content: 'Document rendered successfully.' });
      }
    } else {
      continueLoop = false;
    }
  }
}

// ── Turn state helpers ────────────────────────────────────────────────────────

function appendBlock(turns: AgentDisplayTurn[], assistantTurnId: string, block: AgentBlock): AgentDisplayTurn[] {
  return turns.map((t) =>
    t.id === assistantTurnId ? { ...t, blocks: [...(t as AssistantTurn).blocks, block] } : t,
  );
}

function patchBlock(
  turns: AgentDisplayTurn[],
  assistantTurnId: string,
  blockId: string,
  patch: Record<string, unknown>,
): AgentDisplayTurn[] {
  return turns.map((t) =>
    t.id === assistantTurnId
      ? { ...t, blocks: (t as AssistantTurn).blocks.map((b) => (b.id === blockId ? { ...b, ...patch } as AgentBlock : b)) }
      : t,
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAgent() {
  const storedRef = useRef(loadAgentHistory());
  const stored = storedRef.current;

  const [turns, setTurns] = useState<AgentDisplayTurn[]>(stored?.turns ?? []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [config, setConfig] = useState<AnthropicConfig>(loadConfig);

  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(stored?.maxId ?? 0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const apiHistoryRef = useRef<ApiMessage[]>(stored?.apiHistory ?? []);
  const openaiHistoryRef = useRef<OpenAIMessage[]>(stored?.openaiHistory ?? []);

  const nextId = useCallback(() => String(++idRef.current), []);

  // Re-parse tool_use documents after restoring from storage
  useEffect(() => {
    const s = storedRef.current;
    if (!s) return;
    for (const turn of s.turns) {
      if (turn.role !== 'assistant') continue;
      for (const block of (turn as AssistantTurn).blocks) {
        if (block.type === 'tool_use' && block.document) {
          const { id: blockId, document } = block;
          const turnId = turn.id;
          parseMarkdown(document)
            .then(({ ast, store }) => setTurns((prev) => patchBlock(prev, turnId, blockId, { ast, store })))
            .catch(() => null);
        }
      }
    }
  }, []);

  // Save history after each completed generation; clear when empty
  useEffect(() => {
    if (isGenerating) return;
    if (turns.length === 0) { clearAgentHistory(); return; }
    saveAgentHistory(turns, apiHistoryRef.current, openaiHistoryRef.current);
  }, [turns, isGenerating]);

  const updateConfig = useCallback((patch: Partial<AnthropicConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      return next;
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;
    setError(null);
    setIsGenerating(true);
    setInput('');

    const assistantTurnId = nextId();
    setTurns((prev) => [
      ...prev,
      { id: nextId(), role: 'user', content: text },
      { id: assistantTurnId, role: 'assistant', blocks: [] },
    ]);

    abortRef.current = new AbortController();
    const systemPrompt = buildSystemPrompt({
      authorPrompt: getAuthorPromptVariant(config.systemPromptId).prompt,
      customPrompt: getAgentToolPromptVariant(config.systemPromptId).prompt,
    });

    const provider = config.provider ?? 'anthropic';

    try {
      if (provider === 'openai') {
        const history = [...openaiHistoryRef.current, { role: 'user' as const, content: text }];
        await runOpenAIAgentLoop(config, systemPrompt, history, assistantTurnId, abortRef.current.signal, setTurns, setError, nextId);
        openaiHistoryRef.current = history;
      } else {
        const history: ApiMessage[] = [...apiHistoryRef.current, { role: 'user', content: text }];
        await runAgentLoop(config, systemPrompt, history, assistantTurnId, abortRef.current.signal, setTurns, setError, nextId);
        apiHistoryRef.current = history;
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [config, input, isGenerating, nextId]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setTurns([]);
    setError(null);
    setInput('');
    apiHistoryRef.current = [];
    openaiHistoryRef.current = [];
    inputRef.current?.focus();
  }, []);

  return { turns, isGenerating, error, input, setInput, config, updateConfig, send, stop, clear, inputRef };
}
