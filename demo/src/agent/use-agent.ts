import { useState, useCallback, useRef, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  buildSystemPrompt,
  buildFixerPrompt,
  buildFixerMessage,
  getAuthorPromptVariant,
  getAgentToolPromptVariant,
  MDMA_IL_AGENT_SYSTEM_PROMPT,
} from '@mobile-reality/mdma-prompt-pack';
import { validate } from '@mobile-reality/mdma-validator';
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
import { getDefaultPromptVariantForModel } from '../model-prompt-variant.js';
import type { AgentDisplayTurn, AssistantTurn, AgentBlock } from './types.js';

// ── Tool definitions ─────────────────────────────────────────────────────────

const GENERATE_MDMA_TOOL_INLINE = {
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

// Sub-agent mode: the conversation agent describes the intent; a separate
// author sub-agent (same model + provider) produces the actual MDMA. The
// conversation agent never writes raw MDMA into its visible response.
const GENERATE_MDMA_TOOL_BRIEF = {
  name: 'generate_mdma',
  description:
    'Request the MDMA Author (a specialised sub-agent) to generate an interactive MDMA component ' +
    'for the user. Provide a clear brief describing what to generate — component type, id, fields, ' +
    'labels, action labels (onSubmit etc.), and any constraints. Do NOT write MDMA Markdown yourself; ' +
    'the author will produce the final document and render it on the user’s screen.',
  input_schema: {
    type: 'object' as const,
    properties: {
      brief: {
        type: 'string',
        description:
          'A natural-language description of the MDMA component(s) to generate. Include the ' +
          'component type, id, every field with its label/type, required/sensitive flags, ' +
          'onSubmit / onAction labels, and any other constraints. Do not include MDMA syntax.',
      },
    },
    required: ['brief'],
  },
};

// ── Own-model (mdma-26b) endpoint ─────────────────────────────────────────────
// Our self-hosted model, served OpenAI-compatible with tool-calling enabled.
// In "own-model" provider mode the WHOLE agent loop runs here (conversation +
// generate_mdma via tool_choice:auto), so no third-party model is called.
// Auth is off (placeholder key); enable_thinking must be false; temperature 1
// for agentic/conversational use.
const OWN_MODEL_BASE_URL =
  import.meta.env.VITE_OWN_MODEL_BASE_URL ??
  'https://REDACTED.modal.run/v1';
const OWN_MODEL_NAME = import.meta.env.VITE_OWN_MODEL_NAME ?? 'mdma-26b';

// Extra OpenAI-request body our endpoint needs (merged in by the OpenAI client).
// `max_tokens` bounds the response server-side so a runaway reasoning channel
// can't generate forever (the client also caps the stream defensively).
//
// `min_p` + `repetition_penalty` cut the degenerate reasoning repetition loop
// (word-doubling → token-doubling → single-token flooding) that is a known
// Gemma 4 trait — see evals/own-model/repetition-loops.md. `min_p` is the
// primary tail-cutter; `repetition_penalty` starts low (raise only if needed —
// too high hurts valid output). DRY would be ideal but vLLM doesn't support it.
const OWN_MODEL_EXTRA_BODY = {
  temperature: 1,
  max_tokens: 8192,
  min_p: 0.02,
  repetition_penalty: 1.1,
  chat_template_kwargs: { enable_thinking: false },
} as const;

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
    if (s) {
      const config: AnthropicConfig = { ...DEFAULT_CONFIG, ...JSON.parse(s) };
      if (!config.systemPromptId)
        config.systemPromptId = getDefaultPromptVariantForModel(config.model);
      return config;
    }
  } catch {
    /* ignore */
  }
  return {
    ...DEFAULT_CONFIG,
    systemPromptId: getDefaultPromptVariantForModel(DEFAULT_CONFIG.model),
  };
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

// ── Sub-agent author dispatch ────────────────────────────────────────────────

type AuthorSubAgent = (brief: string, signal: AbortSignal) => Promise<string>;

async function callAuthorAnthropic(
  config: AnthropicConfig,
  authorPrompt: string,
  brief: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 8192,
      system: authorPrompt,
      messages: [{ role: 'user', content: brief }],
    }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Author sub-agent failed (${response.status}): ${await response.text()}`);
  }
  const json = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  return (json.content ?? [])
    .filter(
      (b): b is { type: 'text'; text: string } => b.type === 'text' && typeof b.text === 'string',
    )
    .map((b) => b.text)
    .join('');
}

async function callAuthorOpenAI(
  config: AnthropicConfig,
  authorPrompt: string,
  brief: string,
  signal: AbortSignal,
): Promise<string> {
  const provider = config.provider ?? 'openai';
  const baseUrl = OPENAI_COMPAT_BASE_URLS[provider] ?? OPENAI_COMPAT_BASE_URLS.openai!;
  const apiKey = getApiKeyForProvider(config);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: authorPrompt },
        { role: 'user', content: brief },
      ],
    }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Author sub-agent failed (${response.status}): ${await response.text()}`);
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? '';
}

function makeAuthorSubAgent(config: AnthropicConfig): AuthorSubAgent {
  const authorPrompt = getAuthorPromptVariant(config.systemPromptId).prompt;
  const provider = config.provider ?? 'anthropic';
  return (brief, signal) =>
    provider === 'anthropic'
      ? callAuthorAnthropic(config, authorPrompt, brief, signal)
      : callAuthorOpenAI(config, authorPrompt, brief, signal);
}

// The author sub-agent occasionally wraps its entire response in an outer
// ```markdown / ```md fence (the "treat the answer as a code block" failure
// mode). If so, peel that outer wrapper off. NEVER strip ```mdma fences —
// those are the document's actual component markers and removing them
// would collapse a multi-block document into a single bare YAML snippet.
function extractDocumentFromBrief(rawText: string): string {
  const trimmed = rawText.trim();
  const outer = trimmed.match(/^```(?:markdown|md)\s*\n([\s\S]*)\n```\s*$/);
  return outer ? outer[1] : rawText;
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
  subAgent: AuthorSubAgent | null,
): Promise<void> {
  const tool = subAgent ? GENERATE_MDMA_TOOL_BRIEF : GENERATE_MDMA_TOOL_INLINE;
  let continueLoop = true;

  while (continueLoop && !signal.aborted) {
    const currentApiBlocks: ApiAssistantBlock[] = [];
    const blockMeta = new Map<number, BlockMeta>();
    let stopReason = 'end_turn';

    for await (const ev of streamAgentMessages(config, systemPrompt, history, [tool], signal)) {
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
          setTurns((prev) =>
            appendBlock(prev, assistantTurnId, {
              id: displayId,
              type: 'thinking',
              content: '',
              isStreaming: true,
            } satisfies AgentBlock),
          );
        } else if (ev.blockType === 'text') {
          const apiBlock: ApiAssistantBlock = { type: 'text', text: '' };
          currentApiBlocks.push(apiBlock);
          blockMeta.set(ev.index, { displayId, apiBlock });
          setTurns((prev) =>
            appendBlock(prev, assistantTurnId, {
              id: displayId,
              type: 'text',
              content: '',
              isStreaming: true,
            } satisfies AgentBlock),
          );
        } else if (ev.blockType === 'tool_use') {
          const toolUseId = ev.toolUseId!;
          const toolName = ev.toolName!;
          const apiBlock: ApiAssistantBlock = {
            type: 'tool_use',
            id: toolUseId,
            name: toolName,
            input: {},
          };
          currentApiBlocks.push(apiBlock);
          blockMeta.set(ev.index, { displayId, apiBlock, partialJson: '' });
          setTurns((prev) =>
            appendBlock(prev, assistantTurnId, {
              id: displayId,
              type: 'tool_use',
              toolUseId,
              name: toolName,
              document: '',
              ast: null,
              store: null,
              isStreaming: true,
            } satisfies AgentBlock),
          );
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
          let parsedInput: { document?: string; brief?: string } = {};
          try {
            parsedInput = JSON.parse(meta.partialJson);
          } catch {
            parsedInput = subAgent ? { brief: meta.partialJson } : { document: meta.partialJson };
          }

          let document: string;
          if (subAgent) {
            const brief = parsedInput.brief ?? '';
            try {
              const raw = await subAgent(brief, signal);
              document = extractDocumentFromBrief(raw);
            } catch (err) {
              onError(err instanceof Error ? err.message : String(err));
              document = '';
            }
            if (meta.apiBlock.type === 'tool_use') meta.apiBlock.input = { brief };
          } else {
            document = parsedInput.document ?? '';
            if (meta.apiBlock.type === 'tool_use') meta.apiBlock.input = { document };
          }

          document = await maybeFixDocument(config, document, signal);
          const parsed = await parseMarkdown(document).catch(() => null);
          const ast = parsed?.ast ?? null;
          const store = parsed?.store ?? null;
          setTurns((prev) =>
            patchBlock(prev, assistantTurnId, meta.displayId, {
              document,
              ast,
              store,
              isStreaming: false,
            }),
          );
        } else {
          setTurns((prev) =>
            patchBlock(prev, assistantTurnId, meta.displayId, { isStreaming: false }),
          );
        }
      }

      if (ev.type === 'message_stop') stopReason = ev.stop_reason;
    }

    if (signal.aborted) break;

    history.push({ role: 'assistant', content: currentApiBlocks });

    if (stopReason === 'tool_use') {
      const toolResults = currentApiBlocks
        .filter((b): b is Extract<ApiAssistantBlock, { type: 'tool_use' }> => b.type === 'tool_use')
        .map((b) => ({
          type: 'tool_result' as const,
          tool_use_id: b.id,
          content: 'Document rendered successfully.',
        }));
      if (toolResults.length > 0) history.push({ role: 'user', content: toolResults });
    } else {
      continueLoop = false;
    }
  }
}

// ── OpenAI agentic loop ───────────────────────────────────────────────────────

const OPENAI_COMPAT_BASE_URLS: Partial<Record<NonNullable<AnthropicConfig['provider']>, string>> = {
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  'own-model': OWN_MODEL_BASE_URL,
};

function getApiKeyForProvider(config: AnthropicConfig): string {
  switch (config.provider) {
    case 'openai':
      return config.openaiApiKey ?? '';
    case 'openrouter':
      return config.openrouterApiKey ?? '';
    case 'own-model':
      return 'unused'; // auth is off on our endpoint; client just needs a non-empty key
    default:
      return config.apiKey;
  }
}

// ── Self-healing fixer ────────────────────────────────────────────────────────
// When generate_mdma returns an invalid document, repair it before render: first
// the validator's deterministic auto-fixes (free), then — for anything left — an
// LLM fixer pass (same provider/model) using the canonical fixer prompt. The
// model's varied slips (HTML-tag thinking, JSON-in-fence, wrong field keys) need
// the LLM; a regex repair can't cover them.

/** Provider-aware one-shot completion (system + user → text). */
async function chatOnce(
  config: AnthropicConfig,
  system: string,
  user: string,
  signal: AbortSignal,
): Promise<string> {
  const provider = config.provider ?? 'anthropic';
  if (provider === 'anthropic') return callAuthorAnthropic(config, system, user, signal);

  const isOwn = provider === 'own-model';
  const baseUrl = OPENAI_COMPAT_BASE_URLS[provider] ?? OPENAI_COMPAT_BASE_URLS.openai!;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${getApiKeyForProvider(config)}` },
    body: JSON.stringify({
      model: isOwn ? OWN_MODEL_NAME : config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0, // strict, deterministic repair
      ...(isOwn ? { max_tokens: 4096, chat_template_kwargs: { enable_thinking: false } } : {}),
    }),
    signal,
  });
  if (!response.ok) throw new Error(`Fixer call failed (${response.status})`);
  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? '';
}

/**
 * Return a valid (or best-effort repaired) MDMA document. No-ops when the input
 * is already valid, so it adds zero latency on the common path.
 */
async function maybeFixDocument(
  config: AnthropicConfig,
  document: string,
  signal: AbortSignal,
): Promise<string> {
  if (!document.trim()) return document;
  // 1. Deterministic auto-fix.
  const r = validate(document, { exclude: ['thinking-block'], autoFix: true });
  if (r.ok) return r.output;

  // 2. LLM fixer for the remaining issues.
  const unfixed = r.issues.filter(
    (i) => !i.fixed && (i.severity === 'error' || i.severity === 'warning'),
  );
  if (unfixed.length === 0) return r.output;

  try {
    const system = `${buildSystemPrompt()}\n\n---\n\n${buildFixerPrompt('single-block')}`;
    const userMessage = buildFixerMessage(document, unfixed, {});
    const fixed = await chatOnce(config, system, userMessage, signal);
    if (fixed) {
      // Accept only if it actually improves validity.
      const after = validate(fixed, { exclude: ['thinking-block'], autoFix: true });
      if (after.summary.errors <= r.summary.errors) return after.output;
    }
  } catch {
    /* fixer failed — fall back to the deterministic best-effort below */
  }
  return r.output;
}

async function runOpenAIAgentLoop(
  config: AnthropicConfig,
  systemPrompt: string,
  history: OpenAIMessage[],
  assistantTurnId: string,
  signal: AbortSignal,
  setTurns: Dispatch<SetStateAction<AgentDisplayTurn[]>>,
  onError: (msg: string) => void,
  nextId: () => string,
  subAgent: AuthorSubAgent | null,
): Promise<void> {
  const isOwnModel = config.provider === 'own-model';
  const baseUrl =
    OPENAI_COMPAT_BASE_URLS[config.provider ?? 'openai'] ?? OPENAI_COMPAT_BASE_URLS.openai!;
  const apiKey = getApiKeyForProvider(config);
  const model = isOwnModel ? OWN_MODEL_NAME : config.model;
  const extraBody = isOwnModel ? OWN_MODEL_EXTRA_BODY : undefined;
  const tool = subAgent ? GENERATE_MDMA_TOOL_BRIEF : GENERATE_MDMA_TOOL_INLINE;
  let continueLoop = true;

  while (continueLoop && !signal.aborted) {
    const blockMeta = new Map<number, BlockMeta>();
    let stopReason = 'end_turn';
    // Track data needed to build the OpenAI-format assistant message for history
    let finishedTextContent = '';
    const finishedToolCalls: Array<{ id: string; name: string; arguments: string }> = [];

    for await (const ev of streamOpenAIAgentMessages(
      apiKey,
      model,
      systemPrompt,
      history,
      [tool],
      signal,
      baseUrl,
      extraBody,
    )) {
      if (ev.type === 'stream_error') {
        onError(ev.message);
        continueLoop = false;
        break;
      }

      if (ev.type === 'block_start') {
        const displayId = nextId();
        if (ev.blockType === 'thinking') {
          // Reasoning channel (delta.reasoning) → collapsible thinking block.
          // Not added to the OpenAI history (only text + tool_calls are).
          const apiBlock: ApiAssistantBlock = { type: 'thinking', thinking: '', signature: '' };
          blockMeta.set(ev.index, { displayId, apiBlock });
          setTurns((prev) =>
            appendBlock(prev, assistantTurnId, {
              id: displayId,
              type: 'thinking',
              content: '',
              isStreaming: true,
            } satisfies AgentBlock),
          );
        } else if (ev.blockType === 'text') {
          const apiBlock: ApiAssistantBlock = { type: 'text', text: '' };
          blockMeta.set(ev.index, { displayId, apiBlock });
          setTurns((prev) =>
            appendBlock(prev, assistantTurnId, {
              id: displayId,
              type: 'text',
              content: '',
              isStreaming: true,
            } satisfies AgentBlock),
          );
        } else if (ev.blockType === 'tool_use') {
          const toolUseId = ev.toolUseId!;
          const toolName = ev.toolName!;
          const apiBlock: ApiAssistantBlock = {
            type: 'tool_use',
            id: toolUseId,
            name: toolName,
            input: {},
          };
          blockMeta.set(ev.index, { displayId, apiBlock, partialJson: '' });
          setTurns((prev) =>
            appendBlock(prev, assistantTurnId, {
              id: displayId,
              type: 'tool_use',
              toolUseId,
              name: toolName,
              document: '',
              ast: null,
              store: null,
              isStreaming: true,
            } satisfies AgentBlock),
          );
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

      if (ev.type === 'thinking_delta') {
        const meta = blockMeta.get(ev.index);
        if (meta?.apiBlock.type === 'thinking') {
          meta.apiBlock.thinking += ev.thinking;
          const snap = meta.apiBlock.thinking;
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
          let parsedInput: { document?: string; brief?: string } = {};
          try {
            parsedInput = JSON.parse(meta.partialJson);
          } catch {
            parsedInput = subAgent ? { brief: meta.partialJson } : { document: meta.partialJson };
          }

          let document: string;
          if (subAgent) {
            const brief = parsedInput.brief ?? '';
            try {
              const raw = await subAgent(brief, signal);
              document = extractDocumentFromBrief(raw);
            } catch (err) {
              onError(err instanceof Error ? err.message : String(err));
              document = '';
            }
            if (meta.apiBlock.type === 'tool_use') {
              meta.apiBlock.input = { brief };
              finishedToolCalls.push({
                id: meta.apiBlock.id,
                name: meta.apiBlock.name,
                arguments: meta.partialJson,
              });
            }
          } else {
            document = parsedInput.document ?? '';
            if (meta.apiBlock.type === 'tool_use') {
              meta.apiBlock.input = { document };
              finishedToolCalls.push({
                id: meta.apiBlock.id,
                name: meta.apiBlock.name,
                arguments: meta.partialJson,
              });
            }
          }

          document = await maybeFixDocument(config, document, signal);
          const parsed = await parseMarkdown(document).catch(() => null);
          setTurns((prev) =>
            patchBlock(prev, assistantTurnId, meta.displayId, {
              document,
              ast: parsed?.ast ?? null,
              store: parsed?.store ?? null,
              isStreaming: false,
            }),
          );
        } else {
          setTurns((prev) =>
            patchBlock(prev, assistantTurnId, meta.displayId, { isStreaming: false }),
          );
        }
      }

      if (ev.type === 'message_stop') stopReason = ev.stop_reason;
    }

    if (signal.aborted) break;

    // Push OpenAI-formatted assistant message
    // OpenAI's Chat Completions endpoint rejects `content: null` even when
    // tool_calls are present (despite the spec allowing it). Emit "" so a
    // tool-only assistant turn stays valid in the history.
    const assistantMsg: OpenAIAssistantMessage = {
      role: 'assistant',
      content: finishedTextContent || '',
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
        history.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: 'Document rendered successfully.',
        });
      }
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
      ? {
          ...t,
          blocks: (t as AssistantTurn).blocks.map((b) =>
            b.id === blockId ? ({ ...b, ...patch } as AgentBlock) : b,
          ),
        }
      : t,
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAgentOptions {
  /**
   * When true, the conversation agent never writes raw MDMA. Instead, the
   * `generate_mdma` tool takes a high-level `brief` and a separate author
   * sub-agent (same model + provider) produces the actual document. Keeps
   * MDMA generation out of the chat surface.
   */
  useAuthorSubAgent?: boolean;
  /**
   * Extra flow-definition text appended to the agent's customPrompt. Used by
   * the Insurance Preview to lock the conversation to a specific 4-step
   * flow. When omitted, the agent behaves like the regular Agent Chat.
   */
  flowPrompt?: string;
}

export function useAgent(options: UseAgentOptions = {}) {
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
            .then(({ ast, store }) =>
              setTurns((prev) => patchBlock(prev, turnId, blockId, { ast, store })),
            )
            .catch(() => null);
        }
      }
    }
  }, []);

  // Save history after each completed generation; clear when empty
  useEffect(() => {
    if (isGenerating) return;
    if (turns.length === 0) {
      clearAgentHistory();
      return;
    }
    saveAgentHistory(turns, apiHistoryRef.current, openaiHistoryRef.current);
  }, [turns, isGenerating]);

  const updateConfig = useCallback((patch: Partial<AnthropicConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      return next;
    });
  }, []);

  const runTurn = useCallback(
    async (text: string, hidden: boolean) => {
      if (!text || isGenerating) return;
      setError(null);
      setIsGenerating(true);

      const assistantTurnId = nextId();
      setTurns((prev) => [
        ...prev,
        { id: nextId(), role: 'user', content: text, hidden },
        { id: assistantTurnId, role: 'assistant', blocks: [] },
      ]);

      abortRef.current = new AbortController();
      const provider = config.provider ?? 'anthropic';
      // Our own model runs the whole turn itself (tool-calling enabled), so it
      // emits the MDMA document inline via generate_mdma — no author sub-agent.
      const useSubAgent = (options.useAuthorSubAgent ?? false) && provider !== 'own-model';
      const toolPrompt = getAgentToolPromptVariant(config.systemPromptId).prompt;
      // Our own model gets its own Gemma-aligned agentic prompt (no <thinking>
      // leak — see prompt-pack mdma-agent/mobile-reality/mdma-il). Other
      // providers: sub-agent mode uses just the tool prompt; inline mode layers
      // the author prompt via buildSystemPrompt.
      let systemPrompt: string;
      if (provider === 'own-model') {
        systemPrompt = options.flowPrompt
          ? `${MDMA_IL_AGENT_SYSTEM_PROMPT}\n\n---\n\n${options.flowPrompt}`
          : MDMA_IL_AGENT_SYSTEM_PROMPT;
      } else if (useSubAgent) {
        systemPrompt = options.flowPrompt
          ? `${toolPrompt}\n\n---\n\n${options.flowPrompt}`
          : toolPrompt;
      } else {
        systemPrompt = buildSystemPrompt({
          authorPrompt: getAuthorPromptVariant(config.systemPromptId).prompt,
          customPrompt: options.flowPrompt
            ? `${toolPrompt}\n\n---\n\n${options.flowPrompt}`
            : toolPrompt,
        });
      }

      const subAgent = useSubAgent ? makeAuthorSubAgent(config) : null;

      try {
        if (provider === 'anthropic') {
          const history: ApiMessage[] = [...apiHistoryRef.current, { role: 'user', content: text }];
          await runAgentLoop(
            config,
            systemPrompt,
            history,
            assistantTurnId,
            abortRef.current.signal,
            setTurns,
            setError,
            nextId,
            subAgent,
          );
          apiHistoryRef.current = history;
        } else {
          const history = [...openaiHistoryRef.current, { role: 'user' as const, content: text }];
          await runOpenAIAgentLoop(
            config,
            systemPrompt,
            history,
            assistantTurnId,
            abortRef.current.signal,
            setTurns,
            setError,
            nextId,
            subAgent,
          );
          openaiHistoryRef.current = history;
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
    },
    [config, isGenerating, nextId, options.flowPrompt, options.useAuthorSubAgent],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await runTurn(text, false);
  }, [input, runTurn]);

  const sendHidden = useCallback(
    async (text: string) => {
      await runTurn(text, true);
    },
    [runTurn],
  );

  // Send a specific message as a visible user turn and resolve when the agent's
  // response is fully complete. Used by the auto-play demo to pace the script.
  const sendText = useCallback(
    async (text: string) => {
      await runTurn(text, false);
    },
    [runTurn],
  );

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

  return {
    turns,
    isGenerating,
    error,
    input,
    setInput,
    config,
    updateConfig,
    send,
    sendHidden,
    sendText,
    stop,
    clear,
    inputRef,
  };
}
