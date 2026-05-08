import { useState, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { buildSystemPrompt, getAuthorPromptVariant } from '@mobile-reality/mdma-prompt-pack';
import {
  streamAgentMessages,
  type AnthropicConfig,
  type ApiMessage,
  type ApiAssistantBlock,
} from './anthropic-client.js';
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

const AGENT_CUSTOM_PROMPT =
  'Use the `generate_mdma` tool whenever you create or update an interactive document. ' +
  'Never output raw MDMA Markdown in prose — always call the tool for that. ' +
  'After calling the tool you may briefly summarise what you built.';

// ── Config persistence ───────────────────────────────────────────────────────

const CONFIG_KEY = 'mdma-agent-config';

const DEFAULT_CONFIG: AnthropicConfig = {
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

// ── Per-block streaming metadata ─────────────────────────────────────────────

interface BlockMeta {
  displayId: string;
  apiBlock: ApiAssistantBlock;
  /** Accumulated partial JSON for tool_use blocks; undefined for others. */
  partialJson?: string;
}

// ── Agentic loop ─────────────────────────────────────────────────────────────

/**
 * Runs the full agentic loop for a single user turn.
 *
 * Streams the assistant response, mirrors each block into display state, and
 * — when the model stops with `tool_use` — appends tool results and continues
 * until the model reaches `end_turn`.
 *
 * Mutates `history` in place so the caller can persist it after the loop.
 */
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

      // ── New block starting ─────────────────────────────────────────────────
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

      // ── Content deltas ─────────────────────────────────────────────────────
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

      // ── Block finished ─────────────────────────────────────────────────────
      if (ev.type === 'block_stop') {
        const meta = blockMeta.get(ev.index);
        if (!meta) continue;

        if (meta.partialJson !== undefined) {
          // Tool use: parse JSON input then render MDMA document.
          let document = '';
          try {
            const parsed = JSON.parse(meta.partialJson) as { document?: string };
            document = parsed.document ?? '';
          } catch {
            document = meta.partialJson;
          }

          if (meta.apiBlock.type === 'tool_use') {
            meta.apiBlock.input = { document };
          }

          const parsed = await parseMarkdown(document).catch(() => null);
          const ast = parsed?.ast ?? null;
          const store = parsed?.store ?? null;
          setTurns((prev) => patchBlock(prev, assistantTurnId, meta.displayId, { document, ast, store, isStreaming: false }));
        } else {
          setTurns((prev) => patchBlock(prev, assistantTurnId, meta.displayId, { isStreaming: false }));
        }
      }

      if (ev.type === 'message_stop') {
        stopReason = ev.stop_reason;
      }
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

// ── Turn state helpers ────────────────────────────────────────────────────────

function appendBlock(
  turns: AgentDisplayTurn[],
  assistantTurnId: string,
  block: AgentBlock,
): AgentDisplayTurn[] {
  return turns.map((t) =>
    t.id === assistantTurnId
      ? { ...t, blocks: [...(t as AssistantTurn).blocks, block] }
      : t,
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
  const [turns, setTurns] = useState<AgentDisplayTurn[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [config, setConfig] = useState<AnthropicConfig>(loadConfig);

  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const apiHistoryRef = useRef<ApiMessage[]>([]);

  const nextId = useCallback(() => String(++idRef.current), []);

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
      customPrompt: AGENT_CUSTOM_PROMPT,
    });
    const history: ApiMessage[] = [...apiHistoryRef.current, { role: 'user', content: text }];

    try {
      await runAgentLoop(config, systemPrompt, history, assistantTurnId, abortRef.current.signal, setTurns, setError, nextId);
      apiHistoryRef.current = history;
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
    inputRef.current?.focus();
  }, []);

  return { turns, isGenerating, error, input, setInput, config, updateConfig, send, stop, clear, inputRef };
}
