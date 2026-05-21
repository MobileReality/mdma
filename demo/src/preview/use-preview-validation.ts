import { useEffect, useRef, useState } from 'react';
import {
  validate,
  type ValidationIssue,
  type ValidationResult,
} from '@mobile-reality/mdma-validator';
import {
  buildFixerPrompt,
  buildFixerMessage,
  buildSystemPrompt,
} from '@mobile-reality/mdma-prompt-pack';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import type { AgentDisplayTurn, AssistantTurn, ToolUseBlock } from '../agent/types.js';
import type { AnthropicConfig } from '../agent/anthropic-client.js';
import { chatCompletion, type LlmConfig } from '../llm-client.js';
import { parseMarkdown } from '../chat/parse-markdown.js';

export type PreviewStatus = 'idle' | 'validating' | 'fixing' | 'ready' | 'invalid';

export interface PreviewState {
  status: PreviewStatus;
  ast: MdmaRoot | null;
  store: DocumentStore | null;
  unresolvedIssues: ValidationIssue[];
  wasFixed: boolean;
  /** Id of the block currently being rendered (the agent's tool_use block id). */
  blockId: string | null;
  /**
   * True when the rendered block is from an earlier step than the latest
   * one — i.e. it's already been submitted in the flow and re-interacting
   * with it shouldn't happen. PreviewPanel uses this to disable inputs.
   */
  submitted: boolean;
}

interface UsePreviewValidationOptions {
  turns: AgentDisplayTurn[];
  /**
   * When set, show this specific tool_use block. When null, show the latest.
   */
  selectedBlockId: string | null;
  /**
   * Same config the agent uses. The fixer picks its credentials + model
   * from this — anthropic provider → haiku via x-api-key, openai → gpt-4.1-mini,
   * openrouter → anthropic/claude-haiku-4-5 via openrouter.
   */
  agentConfig: AnthropicConfig;
}

const INITIAL_STATE: PreviewState = {
  status: 'idle',
  ast: null,
  store: null,
  unresolvedIssues: [],
  wasFixed: false,
  blockId: null,
  submitted: false,
};

type FixerResolution =
  | {
      kind: 'anthropic';
      apiKey: string;
      model: string;
    }
  | {
      kind: 'openai-compatible';
      apiKey: string;
      baseUrl: string;
      model: string;
    };

/**
 * Picks the fixer endpoint + model based on the agent's current provider.
 * Returns null when the relevant API key isn't configured.
 */
function resolveFixer(config: AnthropicConfig): FixerResolution | null {
  const provider = config.provider ?? 'anthropic';
  if (provider === 'anthropic') {
    if (!config.apiKey) return null;
    return { kind: 'anthropic', apiKey: config.apiKey, model: 'claude-haiku-4-5-20251001' };
  }
  if (provider === 'openai') {
    if (!config.openaiApiKey) return null;
    return {
      kind: 'openai-compatible',
      apiKey: config.openaiApiKey,
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4.1-mini',
    };
  }
  if (provider === 'openrouter') {
    if (!config.openrouterApiKey) return null;
    return {
      kind: 'openai-compatible',
      apiKey: config.openrouterApiKey,
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-haiku-4-5',
    };
  }
  return null;
}

/**
 * Non-streaming Anthropic Messages API call — used by the fixer when the
 * agent provider is anthropic. Reuses the same direct-browser-access
 * header the streaming agent client sets.
 */
async function anthropicFix(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
    signal,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic fixer failed (${response.status}): ${body}`);
  }
  const json = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (json.content ?? [])
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('');
  return text;
}

function collectToolUseBlocks(turns: AgentDisplayTurn[]): ToolUseBlock[] {
  const blocks: ToolUseBlock[] = [];
  for (const turn of turns) {
    if (turn.role !== 'assistant') continue;
    for (const block of (turn as AssistantTurn).blocks) {
      if (block.type === 'tool_use') blocks.push(block);
    }
  }
  return blocks;
}

function resolveBlock(
  turns: AgentDisplayTurn[],
  selectedBlockId: string | null,
): { block: ToolUseBlock | null; submitted: boolean } {
  const all = collectToolUseBlocks(turns);
  if (all.length === 0) return { block: null, submitted: false };
  if (!selectedBlockId) {
    return { block: all[all.length - 1], submitted: false };
  }
  const idx = all.findIndex((b) => b.id === selectedBlockId);
  if (idx === -1) return { block: all[all.length - 1], submitted: false };
  return { block: all[idx], submitted: idx < all.length - 1 };
}

/**
 * Validates the latest assistant tool_use block's MDMA document and, if it
 * fails validation, runs the LLM fixer (single-block scope) to repair it
 * before rendering. The fixer model + credentials are picked from the
 * agent's current provider (see resolveFixer).
 */
export function usePreviewValidation({
  turns,
  selectedBlockId,
  agentConfig,
}: UsePreviewValidationOptions): PreviewState {
  const [state, setState] = useState<PreviewState>(INITIAL_STATE);
  const handledRef = useRef(new Map<string, PreviewState>());
  const inFlightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const { block, submitted } = resolveBlock(turns, selectedBlockId);
    if (!block) {
      setState(INITIAL_STATE);
      return;
    }

    if (block.isStreaming || !block.document) {
      setState({
        status: 'validating',
        ast: null,
        store: null,
        unresolvedIssues: [],
        wasFixed: false,
        blockId: block.id,
        submitted,
      });
      return;
    }

    // De-dupe on (blockId, doc length) so toggling the selection between
    // already-processed blocks re-uses the cached PreviewState instead of
    // re-running validation + fixer.
    const handleKey = `${block.id}:${block.document.length}`;
    const cached = handledRef.current.get(handleKey);
    if (cached) {
      setState({ ...cached, submitted });
      return;
    }

    inFlightRef.current?.abort();
    inFlightRef.current = null;

    const fixer = resolveFixer(agentConfig);
    void processBlock(
      block,
      fixer,
      (next) => {
        const withFlags = { ...next, blockId: block.id, submitted };
        // Snapshot terminal states so revisits don't refire the LLM.
        if (next.status === 'ready' || next.status === 'invalid') {
          handledRef.current.set(handleKey, withFlags);
        }
        setState(withFlags);
      },
      (ctrl) => {
        inFlightRef.current = ctrl;
      },
    );
  }, [turns, selectedBlockId, agentConfig]);

  const prevTurnCount = useRef(turns.length);
  useEffect(() => {
    if (prevTurnCount.current > 0 && turns.length === 0) {
      handledRef.current.clear();
      inFlightRef.current?.abort();
      inFlightRef.current = null;
      setState(INITIAL_STATE);
    }
    prevTurnCount.current = turns.length;
  }, [turns.length]);

  return state;
}

async function processBlock(
  block: ToolUseBlock,
  fixer: FixerResolution | null,
  setState: (state: PreviewState) => void,
  registerAbort: (ctrl: AbortController) => void,
): Promise<void> {
  setState({
    status: 'validating',
    ast: null,
    store: null,
    unresolvedIssues: [],
    wasFixed: false,
    blockId: block.id,
    submitted: false,
  });

  const initial: ValidationResult = validate(block.document, {
    exclude: ['thinking-block', 'flow-ordering'],
  });
  const unfixed = initial.issues.filter(
    (i) => !i.fixed && (i.severity === 'error' || i.severity === 'warning'),
  );

  if (unfixed.length === 0) {
    const { ast, store } = await parseMarkdown(initial.output);
    setState({
      status: 'ready',
      ast,
      store,
      unresolvedIssues: [],
      wasFixed: initial.fixCount > 0,
      blockId: block.id,
      submitted: false,
    });
    return;
  }

  if (!fixer) {
    try {
      const { ast, store } = await parseMarkdown(initial.output);
      setState({
        status: 'invalid',
        ast,
        store,
        unresolvedIssues: unfixed,
        wasFixed: false,
        blockId: block.id,
        submitted: false,
      });
    } catch {
      setState({
        status: 'invalid',
        ast: null,
        store: null,
        unresolvedIssues: unfixed,
        wasFixed: false,
        blockId: block.id,
        submitted: false,
      });
    }
    return;
  }

  setState({
    status: 'fixing',
    ast: null,
    store: null,
    unresolvedIssues: unfixed,
    wasFixed: false,
    blockId: block.id,
    submitted: false,
  });

  const ctrl = new AbortController();
  registerAbort(ctrl);
  try {
    const systemPrompt = `${buildSystemPrompt()}\n\n---\n\n${buildFixerPrompt('single-block')}`;
    const userMessage = buildFixerMessage(block.document, unfixed);

    let fixed: string;
    if (fixer.kind === 'anthropic') {
      fixed = await anthropicFix(fixer.apiKey, fixer.model, systemPrompt, userMessage, ctrl.signal);
    } else {
      const llmConfig: LlmConfig = {
        baseUrl: fixer.baseUrl,
        apiKey: fixer.apiKey,
        model: fixer.model,
      };
      fixed = await chatCompletion(
        llmConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        ctrl.signal,
      );
    }

    const revalidated = validate(fixed, { exclude: ['thinking-block', 'flow-ordering'] });
    const stillUnfixed = revalidated.issues.filter(
      (i) => !i.fixed && (i.severity === 'error' || i.severity === 'warning'),
    );

    const { ast, store } = await parseMarkdown(revalidated.output);
    setState({
      status: stillUnfixed.length === 0 ? 'ready' : 'invalid',
      ast,
      store,
      unresolvedIssues: stillUnfixed,
      wasFixed: true,
      blockId: block.id,
      submitted: false,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    console.error('[preview-validation] fixer failed', err);
    try {
      const { ast, store } = await parseMarkdown(initial.output);
      setState({
        status: 'invalid',
        ast,
        store,
        unresolvedIssues: unfixed,
        wasFixed: false,
        blockId: block.id,
        submitted: false,
      });
    } catch {
      setState({
        status: 'invalid',
        ast: null,
        store: null,
        unresolvedIssues: unfixed,
        wasFixed: false,
        blockId: block.id,
        submitted: false,
      });
    }
  }
}
