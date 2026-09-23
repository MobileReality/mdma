import type { ChatMessage } from '@shared/ipc';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-5.6-luna';

/**
 * Read at call time, not module load: `process.env` lets a packaged app take the
 * key from the real environment, while `MAIN_VITE_*` covers the local `.env`.
 * Either way this module only ever runs in the main process, so the key is never
 * part of the renderer bundle.
 */
function readKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY ?? import.meta.env.MAIN_VITE_OPENROUTER_API_KEY;
}

function readModel(): string {
  return process.env.MDMA_MODEL ?? import.meta.env.MAIN_VITE_MDMA_MODEL ?? DEFAULT_MODEL;
}

export async function streamChat(
  messages: ChatMessage[],
  onDelta: (chunk: string, full: string) => void,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = readKey();
  if (!apiKey) {
    throw new Error(
      'Missing OpenRouter key. Copy .env.example to .env and set MAIN_VITE_OPENROUTER_API_KEY.',
    );
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'MDMA Electron example',
    },
    body: JSON.stringify({ model: readModel(), messages, stream: true }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenRouter error ${response.status}: ${detail}`);
  }

  return readSseStream(response.body, onDelta);
}

async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (chunk: string, full: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) return full;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // A frame can split across reads, so the trailing partial line stays buffered.
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return full;

      const chunk = parseDelta(data);
      if (chunk) {
        full += chunk;
        onDelta(chunk, full);
      }
    }
  }
}

function parseDelta(data: string): string | undefined {
  try {
    const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
    return json.choices?.[0]?.delta?.content;
  } catch {
    return undefined;
  }
}
