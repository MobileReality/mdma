/**
 * Native Anthropic Messages API client with streaming, tool use, and extended thinking.
 *
 * Uses /v1/messages directly (not the OpenAI-compat layer) so we can access
 * extended thinking blocks and structured tool use.
 */

export interface AnthropicConfig {
  provider?: 'anthropic' | 'openai';
  /** Anthropic API key */
  apiKey: string;
  /** OpenAI API key — stored separately so switching providers doesn't clear it */
  openaiApiKey?: string;
  model: string;
  /** Token budget for extended thinking. Only used when provider is 'anthropic'. */
  thinkingBudget?: number;
  systemPromptId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: object;
}

// ── API content block types ──────────────────────────────────────────────────

export type ApiThinkingBlock = {
  type: 'thinking';
  thinking: string;
  signature: string;
};

export type ApiTextBlock = {
  type: 'text';
  text: string;
};

export type ApiToolUseBlock = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type ApiToolResultBlock = {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
};

export type ApiAssistantBlock = ApiThinkingBlock | ApiTextBlock | ApiToolUseBlock;
export type ApiUserBlock = { type: 'text'; text: string } | ApiToolResultBlock;

export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string | ApiAssistantBlock[] | ApiUserBlock[];
}

// ── Stream events emitted by streamAgentMessages ─────────────────────────────

export type AgentStreamEvent =
  | { type: 'block_start'; index: number; blockType: 'thinking' | 'text' | 'tool_use'; toolUseId?: string; toolName?: string }
  | { type: 'thinking_delta'; index: number; thinking: string }
  | { type: 'signature_delta'; index: number; signature: string }
  | { type: 'text_delta'; index: number; text: string }
  | { type: 'input_json_delta'; index: number; partial_json: string }
  | { type: 'block_stop'; index: number }
  | { type: 'message_stop'; stop_reason: string }
  | { type: 'stream_error'; message: string };

// ── Streaming function ────────────────────────────────────────────────────────

export async function* streamAgentMessages(
  config: AnthropicConfig,
  systemPrompt: string,
  messages: ApiMessage[],
  tools: ToolDefinition[],
  signal?: AbortSignal,
): AsyncGenerator<AgentStreamEvent> {
  const budget = config.thinkingBudget ?? 8000;

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'interleaved-thinking-2025-05-14',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: Math.max(16000, budget + 4000),
        stream: true,
        system: systemPrompt,
        thinking: { type: 'enabled', budget_tokens: budget },
        tools,
        messages,
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    yield { type: 'stream_error', message: err instanceof Error ? err.message : String(err) };
    return;
  }

  if (!response.ok) {
    const body = await response.text();
    yield { type: 'stream_error', message: `Anthropic API ${response.status}: ${body}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'stream_error', message: 'No response body' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let stopReason = 'end_turn';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data) continue;

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }

        const t = parsed.type as string;

        if (t === 'content_block_start') {
          const block = parsed.content_block as Record<string, unknown>;
          const index = parsed.index as number;
          const blockType = block.type as 'thinking' | 'text' | 'tool_use';
          yield {
            type: 'block_start',
            index,
            blockType,
            toolUseId: block.id as string | undefined,
            toolName: block.name as string | undefined,
          };
        } else if (t === 'content_block_delta') {
          const index = parsed.index as number;
          const delta = parsed.delta as Record<string, unknown>;
          const dt = delta.type as string;
          if (dt === 'thinking_delta') {
            yield { type: 'thinking_delta', index, thinking: (delta.thinking as string) ?? '' };
          } else if (dt === 'signature_delta') {
            yield { type: 'signature_delta', index, signature: (delta.signature as string) ?? '' };
          } else if (dt === 'text_delta') {
            yield { type: 'text_delta', index, text: (delta.text as string) ?? '' };
          } else if (dt === 'input_json_delta') {
            yield { type: 'input_json_delta', index, partial_json: (delta.partial_json as string) ?? '' };
          }
        } else if (t === 'content_block_stop') {
          yield { type: 'block_stop', index: parsed.index as number };
        } else if (t === 'message_delta') {
          const delta = parsed.delta as Record<string, unknown>;
          if (delta.stop_reason) stopReason = delta.stop_reason as string;
        } else if (t === 'message_stop') {
          yield { type: 'message_stop', stop_reason: stopReason };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
