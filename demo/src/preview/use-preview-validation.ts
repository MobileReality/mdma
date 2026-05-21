import { useEffect, useRef, useState } from 'react';
import {
  validate,
  type ValidationIssue,
  type ValidationResult,
  type ValidationRuleId,
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
  blockId: string | null;
  submitted: boolean;
}

interface UsePreviewValidationOptions {
  turns: AgentDisplayTurn[];
  selectedBlockId: string | null;
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

const EXCLUDE_RULES: ValidationRuleId[] = ['thinking-block', 'flow-ordering'];
const VALIDATE_OPTIONS = { exclude: EXCLUDE_RULES };

type FixerResolution =
  | { kind: 'anthropic'; apiKey: string; model: string }
  | { kind: 'openai-compatible'; apiKey: string; baseUrl: string; model: string };

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

async function callFixer(
  fixer: FixerResolution,
  document: string,
  unfixed: ValidationIssue[],
  signal: AbortSignal,
): Promise<string> {
  const systemPrompt = `${buildSystemPrompt()}\n\n---\n\n${buildFixerPrompt('single-block')}`;
  const userMessage = buildFixerMessage(document, unfixed);

  if (fixer.kind === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': fixer.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: fixer.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal,
    });
    if (!response.ok) {
      throw new Error(`Anthropic fixer failed (${response.status}): ${await response.text()}`);
    }
    const json = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    return (json.content ?? [])
      .filter(
        (b): b is { type: 'text'; text: string } => b.type === 'text' && typeof b.text === 'string',
      )
      .map((b) => b.text)
      .join('');
  }

  const llmConfig: LlmConfig = {
    baseUrl: fixer.baseUrl,
    apiKey: fixer.apiKey,
    model: fixer.model,
  };
  return chatCompletion(
    llmConfig,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    signal,
  );
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
  if (!selectedBlockId) return { block: all[all.length - 1], submitted: false };
  const idx = all.findIndex((b) => b.id === selectedBlockId);
  if (idx === -1) return { block: all[all.length - 1], submitted: false };
  return { block: all[idx], submitted: idx < all.length - 1 };
}

function getUnfixedIssues(result: ValidationResult): ValidationIssue[] {
  return result.issues.filter(
    (i) => !i.fixed && (i.severity === 'error' || i.severity === 'warning'),
  );
}

function buildState(
  blockId: string,
  submitted: boolean,
  status: PreviewStatus,
  ast: MdmaRoot | null = null,
  store: DocumentStore | null = null,
  unresolvedIssues: ValidationIssue[] = [],
  wasFixed = false,
): PreviewState {
  return { status, ast, store, unresolvedIssues, wasFixed, blockId, submitted };
}

async function tryParse(
  markdown: string,
): Promise<{ ast: MdmaRoot; store: DocumentStore } | null> {
  try {
    return await parseMarkdown(markdown);
  } catch {
    return null;
  }
}

export function usePreviewValidation({
  turns,
  selectedBlockId,
  agentConfig,
}: UsePreviewValidationOptions): PreviewState {
  const [state, setState] = useState<PreviewState>(INITIAL_STATE);
  const cacheRef = useRef(new Map<string, PreviewState>());
  const inFlightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const { block, submitted } = resolveBlock(turns, selectedBlockId);
    if (!block) {
      setState(INITIAL_STATE);
      return;
    }

    if (block.isStreaming || !block.document) {
      setState(buildState(block.id, submitted, 'validating'));
      return;
    }

    const cacheKey = `${block.id}:${block.document.length}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setState({ ...cached, submitted });
      return;
    }

    inFlightRef.current?.abort();
    inFlightRef.current = null;

    const fixer = resolveFixer(agentConfig);
    void processBlock(
      block,
      submitted,
      fixer,
      (next) => {
        if (next.status === 'ready' || next.status === 'invalid') {
          cacheRef.current.set(cacheKey, next);
        }
        setState(next);
      },
      (ctrl) => {
        inFlightRef.current = ctrl;
      },
    );
  }, [turns, selectedBlockId, agentConfig]);

  const prevTurnCount = useRef(turns.length);
  useEffect(() => {
    if (prevTurnCount.current > 0 && turns.length === 0) {
      cacheRef.current.clear();
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
  submitted: boolean,
  fixer: FixerResolution | null,
  setState: (state: PreviewState) => void,
  registerAbort: (ctrl: AbortController) => void,
): Promise<void> {
  setState(buildState(block.id, submitted, 'validating'));

  const initial = validate(block.document, VALIDATE_OPTIONS);
  const unfixed = getUnfixedIssues(initial);

  if (unfixed.length === 0) {
    const parsed = await tryParse(initial.output);
    setState(
      buildState(
        block.id,
        submitted,
        'ready',
        parsed?.ast ?? null,
        parsed?.store ?? null,
        [],
        initial.fixCount > 0,
      ),
    );
    return;
  }

  if (!fixer) {
    const parsed = await tryParse(initial.output);
    setState(
      buildState(
        block.id,
        submitted,
        'invalid',
        parsed?.ast ?? null,
        parsed?.store ?? null,
        unfixed,
      ),
    );
    return;
  }

  setState(buildState(block.id, submitted, 'fixing', null, null, unfixed));

  const ctrl = new AbortController();
  registerAbort(ctrl);
  try {
    const fixed = await callFixer(fixer, block.document, unfixed, ctrl.signal);
    const revalidated = validate(fixed, VALIDATE_OPTIONS);
    const stillUnfixed = getUnfixedIssues(revalidated);
    const parsed = await tryParse(revalidated.output);
    setState(
      buildState(
        block.id,
        submitted,
        stillUnfixed.length === 0 ? 'ready' : 'invalid',
        parsed?.ast ?? null,
        parsed?.store ?? null,
        stillUnfixed,
        true,
      ),
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    console.error('[preview-validation] fixer failed', err);
    const parsed = await tryParse(initial.output);
    setState(
      buildState(
        block.id,
        submitted,
        'invalid',
        parsed?.ast ?? null,
        parsed?.store ?? null,
        unfixed,
      ),
    );
  }
}
