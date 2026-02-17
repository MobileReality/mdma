/**
 * Provider-agnostic LLM client using the OpenAI-compatible chat completion format.
 *
 * Works with: OpenAI, Anthropic (via OpenAI compat), Ollama, Groq, Together, LM Studio,
 * and any provider exposing the /v1/chat/completions endpoint.
 */

export interface LlmConfig {
  /** Base URL of the API (e.g. "https://api.openai.com/v1", "http://localhost:11434/v1") */
  baseUrl: string;
  /** API key (leave empty for local models like Ollama) */
  apiKey: string;
  /** Model identifier (e.g. "gpt-4o", "claude-sonnet-4-5-20250929", "llama3") */
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const DEFAULT_CONFIG: LlmConfig = {
  baseUrl: 'http://localhost:11434/v1',
  apiKey: '',
  model: 'llama3',
};

export const PROVIDER_PRESETS: Record<string, LlmConfig> = {
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    model: 'llama3',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    model: 'claude-sonnet-4-5-20250929',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: '',
    model: 'llama-3.3-70b-versatile',
  },
};

/**
 * Stream a chat completion from any OpenAI-compatible endpoint.
 * Yields text chunks as they arrive.
 */
export async function* streamChatCompletion(
  config: LlmConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM API error ${response.status}: ${body}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // Skip malformed chunks
      }
    }
  }
}

/**
 * Non-streaming chat completion fallback.
 */
export async function chatCompletion(
  config: LlmConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false,
    }),
    signal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM API error ${response.status}: ${body}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content ?? '';
}
