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
}

interface UsePreviewValidationOptions {
  turns: AgentDisplayTurn[];
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

function findLatestToolUseBlock(turns: AgentDisplayTurn[]): ToolUseBlock | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.role !== 'assistant') continue;
    const blocks = (turn as AssistantTurn).blocks;
    for (let j = blocks.length - 1; j >= 0; j--) {
      const block = blocks[j];
      if (block.type === 'tool_use') return block;
    }
  }
  return null;
}

/**
 * Validates the latest assistant tool_use block's MDMA document and, if it
 * fails validation, runs the LLM fixer (single-block scope) to repair it
 * before rendering. The fixer model + credentials are picked from the
 * agent's current provider (see resolveFixer).
 */
export function usePreviewValidation({
  turns,
  agentConfig,
}: UsePreviewValidationOptions): PreviewState {
  const [state, setState] = useState<PreviewState>(INITIAL_STATE);
  const handledRef = useRef(new Set<string>());
  const inFlightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const block = findLatestToolUseBlock(turns);
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
      });
      return;
    }

    const handleKey = `${block.id}:${block.document.length}`;
    if (handledRef.current.has(handleKey)) return;
    handledRef.current.add(handleKey);

    inFlightRef.current?.abort();
    inFlightRef.current = null;

    const fixer = resolveFixer(agentConfig);
    void processBlock(block, fixer, setState, (ctrl) => {
      inFlightRef.current = ctrl;
    });
  }, [turns, agentConfig]);

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
      });
    } catch {
      setState({
        status: 'invalid',
        ast: null,
        store: null,
        unresolvedIssues: unfixed,
        wasFixed: false,
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
      });
    } catch {
      setState({
        status: 'invalid',
        ast: null,
        store: null,
        unresolvedIssues: unfixed,
        wasFixed: false,
      });
    }
  }
}
