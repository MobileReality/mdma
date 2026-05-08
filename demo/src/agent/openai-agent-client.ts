import type { AgentStreamEvent, ToolDefinition } from './anthropic-client.js';

export interface OpenAIUserMessage {
  role: 'user';
  content: string;
}

export interface OpenAIAssistantMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
}

export interface OpenAIToolMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export type OpenAIMessage = OpenAIUserMessage | OpenAIAssistantMessage | OpenAIToolMessage;

// text block always lives at index 0; tool calls at 1, 2, …
const TEXT_IDX = 0;
const TOOL_IDX_OFFSET = 1;

export async function* streamOpenAIAgentMessages(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: OpenAIMessage[],
  tools: ToolDefinition[],
  signal?: AbortSignal,
): AsyncGenerator<AgentStreamEvent> {
  const openAITools = tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        tools: openAITools,
        tool_choice: 'auto',
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
    yield { type: 'stream_error', message: `OpenAI API ${response.status}: ${body}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'stream_error', message: 'No response body' };
    return;
  }

  const decoder = new TextDecoder();
  let buf = '';
  let finishReason = 'stop';
  const startedBlocks = new Set<number>();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }

        const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
        if (!choices?.length) continue;

        const choice = choices[0] as Record<string, unknown>;
        const delta = choice.delta as Record<string, unknown> | undefined;
        const finish = choice.finish_reason as string | null;
        if (finish) finishReason = finish;
        if (!delta) continue;

        if (typeof delta.content === 'string' && delta.content) {
          if (!startedBlocks.has(TEXT_IDX)) {
            startedBlocks.add(TEXT_IDX);
            yield { type: 'block_start', index: TEXT_IDX, blockType: 'text' };
          }
          yield { type: 'text_delta', index: TEXT_IDX, text: delta.content };
        }

        const toolCalls = delta.tool_calls as Array<Record<string, unknown>> | undefined;
        if (toolCalls) {
          for (const tc of toolCalls) {
            const tcIdx = tc.index as number;
            const virtualIdx = TOOL_IDX_OFFSET + tcIdx;
            const fn = tc.function as Record<string, unknown> | undefined;

            if (!startedBlocks.has(virtualIdx)) {
              startedBlocks.add(virtualIdx);
              yield {
                type: 'block_start',
                index: virtualIdx,
                blockType: 'tool_use',
                toolUseId: (tc.id as string) ?? '',
                toolName: (fn?.name as string) ?? '',
              };
            }

            if (fn?.arguments) {
              yield { type: 'input_json_delta', index: virtualIdx, partial_json: fn.arguments as string };
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (startedBlocks.has(TEXT_IDX)) yield { type: 'block_stop', index: TEXT_IDX };
  for (const tcIdx of Array.from(startedBlocks).filter((i) => i >= TOOL_IDX_OFFSET)) {
    yield { type: 'block_stop', index: tcIdx };
  }
  yield { type: 'message_stop', stop_reason: finishReason === 'tool_calls' ? 'tool_use' : 'end_turn' };
}
