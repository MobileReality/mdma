import { streamText, generateText, tool, stepCountIs, jsonSchema, type ModelMessage } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { fetch as expoFetch } from 'expo/fetch';
import { MDMA_AUTHOR_PROMPT, getAgentToolPromptVariant } from '@mobile-reality/mdma-prompt-pack';

/**
 * Provider-agnostic MDMA *agent* on the Vercel AI SDK, mirroring the web demo's
 * Agent Chat (sub-agent / brief mode). Two roles:
 *
 *  - Conversation model — chats and, when a UI is needed, calls `generate_mdma`
 *    with a natural-language **brief**. It is explicitly told NOT to write MDMA,
 *    so it can never duplicate the document into its visible reply.
 *  - Author sub-agent — a separate one-shot call (same provider/model) that
 *    turns the brief into the actual MDMA document, which we render.
 *
 * Streaming uses Expo's `fetch` (`expo/fetch`) so tokens arrive live on device.
 */

export type ProviderId = 'openrouter' | 'anthropic' | 'openai';

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  defaultModel: string;
  envVar: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    defaultModel: 'openai/gpt-5.4',
    envVar: 'EXPO_PUBLIC_OPENROUTER_API_KEY',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    defaultModel: 'claude-opus-4-8',
    envVar: 'EXPO_PUBLIC_ANTHROPIC_API_KEY',
  },
  { id: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o', envVar: 'EXPO_PUBLIC_OPENAI_API_KEY' },
];

const ENV_KEYS: Record<ProviderId, string | undefined> = {
  openrouter: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY,
  anthropic: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  openai: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
};

export function keyFor(provider: ProviderId): string | undefined {
  const k = ENV_KEYS[provider]?.trim();
  return k || undefined;
}

export const DEFAULT_PROVIDER: ProviderId =
  (process.env.EXPO_PUBLIC_LLM_PROVIDER as ProviderId) ||
  PROVIDERS.find((p) => keyFor(p.id))?.id ||
  'openrouter';

export function defaultModelFor(provider: ProviderId): string {
  if (process.env.EXPO_PUBLIC_LLM_MODEL) return process.env.EXPO_PUBLIC_LLM_MODEL;
  return PROVIDERS.find((p) => p.id === provider)?.defaultModel ?? 'gpt-4o';
}

const rnFetch = expoFetch as unknown as typeof globalThis.fetch;

function modelFor(provider: ProviderId, apiKey: string, modelId: string) {
  switch (provider) {
    case 'anthropic':
      return createAnthropic({
        apiKey,
        fetch: rnFetch,
        headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
      })(modelId);
    case 'openrouter':
      return createOpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1', fetch: rnFetch })(
        modelId,
      );
    default:
      return createOpenAI({ apiKey, fetch: rnFetch })(modelId);
  }
}

// Pick the agent-tool prompt variant from the model (OpenRouter routes to many
// models; GPT needs its own tool-use framing).
function agentVariantId(provider: ProviderId, model: string): string {
  const slug = (model.includes('/') ? model.split('/').pop()! : model).toLowerCase();
  if (slug.startsWith('gpt-')) return `openai/${slug}`;
  if (provider === 'openai') return 'openai';
  return 'default';
}

// Sub-agent mode: the conversation model's system prompt is JUST the agent-tool
// prompt — NOT wrapped with the author spec — so it never learns to write MDMA
// itself. Matches the web demo's `useSubAgent` branch.
function conversationSystemPrompt(provider: ProviderId, model: string): string {
  return getAgentToolPromptVariant(agentVariantId(provider, model)).prompt;
}

// Brief-mode tool contract (from the web demo's GENERATE_MDMA_TOOL_BRIEF): the
// model describes what to build; the author sub-agent writes the document.
const BRIEF_TOOL_DESCRIPTION =
  'Request the MDMA Author (a specialised sub-agent) to generate an interactive MDMA component ' +
  'for the user. Provide a clear brief describing what to generate — component type, id, fields, ' +
  'labels, action labels (onSubmit etc.), and any constraints. Do NOT write MDMA Markdown yourself; ' +
  'the author will produce the final document and render it on the user’s screen.';

// The author sub-agent occasionally wraps its whole response in an outer
// ```markdown / ```md fence. Peel that off — but NEVER strip ```mdma fences,
// which are the document's actual component markers.
function extractDocument(raw: string): string {
  const trimmed = raw.trim();
  const outer = trimmed.match(/^```(?:markdown|md)\s*\n([\s\S]*)\n```\s*$/);
  return outer ? outer[1] : raw;
}

export interface AgentCallbacks {
  onTextDelta: (text: string) => void;
  /** A generate_mdma brief started — show a placeholder keyed by id. */
  onToolStart: (id: string) => void;
  /** The author produced the document for this call. */
  onToolDocument: (id: string, document: string) => void;
  /** The author sub-agent failed for this call. */
  onToolError: (id: string, message: string) => void;
}

export interface RunAgentOptions {
  provider: ProviderId;
  apiKey: string;
  model: string;
  messages: ModelMessage[];
  signal?: AbortSignal;
  callbacks: AgentCallbacks;
}

/**
 * Run one agent turn. The conversation model streams text and emits generate_mdma
 * briefs; each brief is handed to the author sub-agent (inside the tool's
 * `execute`), whose document is surfaced for rendering. Returns the newly
 * generated messages so the caller can append them to the history.
 */
export async function runAgent(opts: RunAgentOptions): Promise<ModelMessage[]> {
  const languageModel = modelFor(opts.provider, opts.apiKey, opts.model);

  const author = async (brief: string): Promise<string> => {
    const { text } = await generateText({
      model: languageModel,
      system: MDMA_AUTHOR_PROMPT,
      prompt: brief,
      abortSignal: opts.signal,
    });
    return extractDocument(text);
  };

  const generateMdma = tool({
    description: BRIEF_TOOL_DESCRIPTION,
    inputSchema: jsonSchema<{ brief: string }>({
      type: 'object',
      properties: {
        brief: {
          type: 'string',
          description:
            'A natural-language description of the MDMA component(s) to generate — component type, ' +
            'id, every field with its label/type, required/sensitive flags, onSubmit / onAction ' +
            'labels, and any other constraints. Do not include MDMA syntax.',
        },
      },
      required: ['brief'],
      additionalProperties: false,
    }),
    execute: async ({ brief }, { toolCallId }) => {
      try {
        const document = await author(brief);
        opts.callbacks.onToolDocument(toolCallId, document);
        return 'Document rendered successfully.';
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        opts.callbacks.onToolError(toolCallId, message);
        return `Failed to generate the document: ${message}`;
      }
    },
  });

  const result = streamText({
    model: languageModel,
    system: conversationSystemPrompt(opts.provider, opts.model),
    messages: opts.messages,
    tools: { generate_mdma: generateMdma },
    stopWhen: stepCountIs(6),
    abortSignal: opts.signal,
  });

  for await (const part of result.fullStream) {
    switch (part.type) {
      case 'text-delta':
        opts.callbacks.onTextDelta(part.text);
        break;
      case 'tool-input-start':
        if (part.toolName === 'generate_mdma') opts.callbacks.onToolStart(part.id);
        break;
      case 'error':
        throw part.error instanceof Error ? part.error : new Error(String(part.error));
    }
  }

  const response = await result.response;
  return response.messages;
}
