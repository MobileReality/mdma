/** Minimal OpenRouter chat client (OpenAI-compatible). */
import { MDMA_MODEL, OPENROUTER_API_KEY } from './config';

export interface ORToolCall {
  id: string;
  function: { name: string; arguments: string };
}
export interface ORMessage {
  content?: string | null;
  tool_calls?: ORToolCall[];
}
export type ORResult = { ok: true; msg?: ORMessage } | { ok: false; err: string };

export type Convo = Array<Record<string, unknown>>;

/** One chat call. Pass `tools` to let the model call them; omit to force a text-only reply. */
export async function callOpenRouter(messages: Convo, tools?: unknown[]): Promise<ORResult> {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5188',
      'X-Title': 'MDMA AG-UI example',
    },
    body: JSON.stringify({
      model: MDMA_MODEL,
      messages,
      ...(tools ? { tools, tool_choice: 'auto' } : {}),
    }),
  });
  const json = (await resp.json()) as { choices?: Array<{ message?: ORMessage }> };
  if (!resp.ok)
    return { ok: false, err: `**OpenRouter error ${resp.status}:** ${JSON.stringify(json)}` };
  return { ok: true, msg: json.choices?.[0]?.message };
}
