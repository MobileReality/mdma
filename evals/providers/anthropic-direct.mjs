/**
 * promptfoo provider that calls Anthropic's Messages API directly.
 *
 * The built-in `anthropic:messages:*` provider always sends `temperature`,
 * which newer Claude models reject (`temperature is deprecated`), and it
 * forwards empty assistant turns that the API refuses. This provider sends
 * neither, and reports a `refusal` stop reason as an error instead of an empty
 * answer so a safety refusal is not scored as a prompt failure.
 *
 * Use:
 *   ANTHROPIC_MODEL=claude-sonnet-5-5 \
 *   EVAL_PROVIDER=file://providers/anthropic-direct.mjs promptfoo eval -c <config>
 *
 * `id()` returns `anthropic:messages:<model>`, which `select-prompt.mjs` routes
 * to the matching `anthropic/<model>.ts` author prompt variant.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';

function toAnthropicMessages(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!Array.isArray(parsed)) parsed = [{ role: 'user', content: raw }];
  const system = [];
  const messages = [];
  for (const message of parsed) {
    const content = typeof message.content === 'string' ? message.content : '';
    if (message.role === 'system') {
      if (content.trim()) system.push(content);
      continue;
    }
    if (!content.trim()) continue;
    const last = messages.at(-1);
    if (last && last.role === message.role) last.content += `\n\n${content}`;
    else messages.push({ role: message.role, content });
  }
  return { system: system.join('\n\n'), messages };
}

export default class AnthropicDirectProvider {
  constructor(options = {}) {
    this.model = options.config?.model ?? process.env.ANTHROPIC_MODEL;
    this.maxTokens = options.config?.max_tokens ?? 8192;
  }

  id() {
    return `anthropic:messages:${this.model}`;
  }

  async callApi(prompt) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { error: 'ANTHROPIC_API_KEY is not set' };
    if (!this.model) return { error: 'ANTHROPIC_MODEL is not set' };

    const { system, messages } = toAnthropicMessages(prompt);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        ...(system ? { system } : {}),
        messages,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      return {
        error: `Anthropic API ${response.status}: ${body.error?.message ?? JSON.stringify(body)}`,
      };
    }
    if (body.stop_reason === 'refusal') {
      return { error: `Anthropic refusal (${body.stop_details?.category ?? 'unknown'})` };
    }
    const output = (body.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
    return {
      output,
      tokenUsage: {
        prompt: body.usage?.input_tokens,
        completion: body.usage?.output_tokens,
        total: (body.usage?.input_tokens ?? 0) + (body.usage?.output_tokens ?? 0),
      },
    };
  }
}
