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

// reasoning block lives at -1 (rendered first), text at 0, tool calls at 1, 2, …
const REASONING_IDX = -1;
const TEXT_IDX = 0;
const TOOL_IDX_OFFSET = 1;

// Safety limits so a stalled or runaway stream can never hang the UI. Our
// self-hosted endpoint can emit an unbounded `delta.reasoning` channel (the
// model's chain-of-thought); without these a non-terminating stream leaves the
// agent loop awaiting forever and `isGenerating` stuck true.
const IDLE_TIMEOUT_MS = 60_000; // no chunk for this long → assume the stream died
const MAX_STREAM_MS = 240_000; // hard wall-clock ceiling for one response
const MAX_STREAM_BYTES = 4_000_000; // ~4 MB of SSE text → runaway guard

// Loop detector. Gemma 4's known repetition collapse (see
// evals/own-model/repetition-loops.md) degrades a thinking block into a short
// token/phrase flooding the budget. `min_p` + `repetition_penalty` cut most of
// it, but the collapse is an unfixed model trait, so we keep a cheap safety
// net: over a sliding window of recent words, a healthy stream is lexically
// diverse; a degenerate loop (one token, or a cycle like
// `(END) (DONE) (STOP) (FINAL) …`) collapses unique/total. Below the floor we
// abort rather than let it eat the whole generation.
//
// We run this on BOTH channels. The collapse usually lives in `reasoning`, but
// it can also leak onto `content`: the model emits a valid document, then keeps
// going with a raw "Thinking Process:" ramble after the reasoning span has
// already closed. A legit MDMA document is well above the diversity floor, so
// guarding content does not false-positive on real output.
const LOOP_WINDOW_WORDS = 160; // sliding window of recent words
const LOOP_MIN_WORDS = 120; // don't judge until we have enough signal
const LOOP_UNIQUE_RATIO = 0.15; // unique/total below this → degenerate loop

/** Tracks recent words on one channel and flags a degenerate repetition loop. */
class RepetitionLoopDetector {
  private readonly words: string[] = [];

  /** Feed a delta; returns true once the window collapses into a loop. */
  push(text: string): boolean {
    for (const w of text.split(/\s+/)) {
      if (!w) continue;
      this.words.push(w);
      if (this.words.length > LOOP_WINDOW_WORDS) this.words.shift();
    }
    if (this.words.length < LOOP_MIN_WORDS) return false;
    const unique = new Set(this.words).size;
    return unique / this.words.length < LOOP_UNIQUE_RATIO;
  }
}

export async function* streamOpenAIAgentMessages(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: OpenAIMessage[],
  tools: ToolDefinition[],
  signal?: AbortSignal,
  baseUrl = 'https://api.openai.com/v1',
  /** Extra request-body fields merged in (e.g. temperature, chat_template_kwargs). */
  extraBody?: Record<string, unknown>,
): AsyncGenerator<AgentStreamEvent> {
  const openAITools = tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
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
        ...extraBody,
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
  const startedAt = Date.now();
  let totalBytes = 0;
  const reasoningLoopDetector = new RepetitionLoopDetector();
  const contentLoopDetector = new RepetitionLoopDetector();

  try {
    while (true) {
      // Race the read against an idle timer so a stalled stream can't hang.
      const readPromise = reader.read();
      readPromise.catch(() => {}); // swallow rejection if we cancel below
      let idleTimer: ReturnType<typeof setTimeout> | undefined;
      const idle = new Promise<'idle'>((resolve) => {
        idleTimer = setTimeout(() => resolve('idle'), IDLE_TIMEOUT_MS);
      });
      const result = await Promise.race([readPromise, idle]);
      clearTimeout(idleTimer);

      if (result === 'idle') {
        reader.cancel().catch(() => {});
        yield {
          type: 'stream_error',
          message: `Stream stalled — no data for ${IDLE_TIMEOUT_MS / 1000}s. The model may be stuck; please try again.`,
        };
        return;
      }

      const { done, value } = result;
      if (done) break;

      totalBytes += value?.byteLength ?? 0;
      if (totalBytes > MAX_STREAM_BYTES || Date.now() - startedAt > MAX_STREAM_MS) {
        reader.cancel().catch(() => {});
        yield {
          type: 'stream_error',
          message:
            'Stream exceeded safety limits (likely a runaway generation) and was stopped. Please try again.',
        };
        return;
      }

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

        // Our model streams its chain-of-thought on a separate `reasoning`
        // channel (OpenAI-compatible servers like vLLM expose it here). Render
        // it as a collapsible thinking block instead of dropping it on the floor.
        if (typeof delta.reasoning === 'string' && delta.reasoning) {
          if (!startedBlocks.has(REASONING_IDX)) {
            startedBlocks.add(REASONING_IDX);
            yield { type: 'block_start', index: REASONING_IDX, blockType: 'thinking' };
          }
          yield { type: 'thinking_delta', index: REASONING_IDX, thinking: delta.reasoning };

          if (reasoningLoopDetector.push(delta.reasoning)) {
            reader.cancel().catch(() => {});
            yield {
              type: 'stream_error',
              message:
                'The model got stuck repeating itself while thinking and was stopped. Please try again.',
            };
            return;
          }
        }

        if (typeof delta.content === 'string' && delta.content) {
          if (!startedBlocks.has(TEXT_IDX)) {
            startedBlocks.add(TEXT_IDX);
            yield { type: 'block_start', index: TEXT_IDX, blockType: 'text' };
          }
          yield { type: 'text_delta', index: TEXT_IDX, text: delta.content };

          if (contentLoopDetector.push(delta.content)) {
            reader.cancel().catch(() => {});
            yield {
              type: 'stream_error',
              message:
                'The model got stuck repeating itself and was stopped. Please try again.',
            };
            return;
          }
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
              yield {
                type: 'input_json_delta',
                index: virtualIdx,
                partial_json: fn.arguments as string,
              };
            }
          }
        }
      }
    }
  } finally {
    // releaseLock throws if we already cancelled the reader — ignore that.
    try {
      reader.releaseLock();
    } catch {
      /* reader already released via cancel() */
    }
  }

  if (startedBlocks.has(REASONING_IDX)) yield { type: 'block_stop', index: REASONING_IDX };
  if (startedBlocks.has(TEXT_IDX)) yield { type: 'block_stop', index: TEXT_IDX };
  for (const tcIdx of Array.from(startedBlocks).filter((i) => i >= TOOL_IDX_OFFSET)) {
    yield { type: 'block_stop', index: tcIdx };
  }
  yield {
    type: 'message_stop',
    stop_reason: finishReason === 'tool_calls' ? 'tool_use' : 'end_turn',
  };
}
