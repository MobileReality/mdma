/**
 * Minimal streaming OpenRouter client (OpenAI-compatible), called straight from
 * the browser. The key comes from `VITE_OPENROUTER_API_KEY` — fine for a local
 * demo, but note it ships to the client, so don't point it at a funded key you
 * care about. A real app proxies this through a backend (see the ag-ui example).
 */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
export const MODEL =
  (import.meta.env.VITE_MDMA_MODEL as string | undefined) ?? 'openai/gpt-5.6-luna';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Stream a chat completion. Calls `onDelta` with each text chunk as it arrives
 * and resolves with the full text once the stream ends. Throws on a non-OK
 * response or a missing key.
 */
export async function streamChat(
  messages: ChatMessage[],
  onDelta: (chunk: string, full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!API_KEY) {
    throw new Error(
      'Missing VITE_OPENROUTER_API_KEY. Copy .env.example to .env and set your OpenRouter key.',
    );
  }

  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'MDMA Vue example',
    },
    body: JSON.stringify({ model: MODEL, messages, stream: true }),
  });

  if (!resp.ok || !resp.body) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`OpenRouter error ${resp.status}: ${detail}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  // OpenRouter streams Server-Sent Events: `data: {json}\n\n`, ending with
  // `data: [DONE]`. Frames can split across reads, so buffer until a newline.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return full;

      try {
        const json = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const chunk = json.choices?.[0]?.delta?.content;
        if (chunk) {
          full += chunk;
          onDelta(chunk, full);
        }
      } catch {
        // A partial/keepalive frame — ignore and wait for the next.
      }
    }
  }

  return full;
}
