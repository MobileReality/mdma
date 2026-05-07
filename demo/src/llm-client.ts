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
  /**
   * Id of the MDMA Author Prompt variant to use as the system prompt base.
   * Looked up against `AUTHOR_PROMPT_VARIANTS` from the prompt-pack. Falls
   * back to the default variant when unset or unknown.
   */
  systemPromptId?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const DEFAULT_CONFIG: LlmConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-5.4-mini',
};

export const PROVIDER_PRESETS: Record<string, LlmConfig> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-5.4-mini',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    model: 'claude-sonnet-4-6',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    model: 'openai/gpt-5.4-mini',
  },
};

/**
 * Build standard headers for an OpenAI-compatible chat completion request.
 *
 * Anthropic's compat endpoint blocks browser CORS by default. Setting
 * `anthropic-dangerous-direct-browser-access: true` opts in to their
 * browser-direct mode (intended for demos and prototypes — production
 * traffic should still proxy through a backend so the API key isn't
 * exposed to end users).
 */
function buildHeaders(config: LlmConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  if (/api\.anthropic\.com/.test(config.baseUrl)) {
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }
  return headers;
}

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

  const headers = buildHeaders(config);

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

  const headers = buildHeaders(config);

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
