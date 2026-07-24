import { ref } from 'vue';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { streamChat, type ChatMessage } from './openrouter';
import { parseDocument, reparseInto } from './mdma';
import { SYSTEM_PROMPT } from './agent';

export interface Turn {
  id: number;
  role: 'user' | 'assistant';
  /** Raw text. For an assistant turn this is Markdown that may embed `mdma` fences. */
  content: string;
  /** Parsed document + store — assistant turns only, once the first chunk lands. */
  ast?: MdmaRoot;
  store?: DocumentStore;
}

/**
 * Chat state over the OpenRouter stream. Each assistant turn owns a
 * `DocumentStore`, re-parsed on every chunk (`updateAst`) so its embedded MDMA
 * components render live and keep any values the user has already typed.
 */
export function useChat() {
  const turns = ref<Turn[]>([]);
  const isStreaming = ref(false);
  const error = ref<string | null>(null);
  let nextId = 0;
  let controller: AbortController | null = null;

  /** The transcript the model sees — system prompt plus the plain-text turns. */
  function historyFor(): ChatMessage[] {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      ...turns.value.map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
    ];
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming.value) return;

    error.value = null;
    turns.value.push({ id: nextId++, role: 'user', content: trimmed });

    const assistant: Turn = { id: nextId++, role: 'assistant', content: '' };
    turns.value.push(assistant);

    isStreaming.value = true;
    controller = new AbortController();

    // Parsing on every token is wasteful, and `parseDocument` is async — two
    // chunks racing would each create a store. A coalescing runner solves both:
    // chunks only mark the latest text dirty, and one worker parses it, always
    // finishing on the final text so the last chunk is never dropped.
    let pending: string | null = null;
    let running: Promise<void> | null = null;

    const parseLatest = async () => {
      while (pending !== null) {
        const markdown = pending;
        pending = null;
        if (!assistant.store) {
          const { ast, store } = await parseDocument(markdown);
          assistant.ast = ast;
          assistant.store = store;
        } else {
          assistant.ast = await reparseInto(assistant.store, markdown);
        }
        // Nudge Vue: `turns` holds the objects, but ast/store are set on a member.
        turns.value = [...turns.value];
      }
      running = null;
    };

    const scheduleParse = (markdown: string): Promise<void> => {
      pending = markdown;
      if (!running) running = parseLatest();
      return running;
    };

    try {
      await streamChat(
        historyFor().slice(0, -1), // exclude the empty assistant placeholder
        (_chunk, full) => {
          assistant.content = full;
          turns.value = [...turns.value];
          void scheduleParse(full);
        },
        controller.signal,
      );
      // Ensure the final text is parsed even if a chunk landed mid-parse.
      await scheduleParse(assistant.content);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        error.value = (e as Error).message;
      }
    } finally {
      isStreaming.value = false;
      controller = null;
    }
  }

  function stop() {
    controller?.abort();
  }

  function clear() {
    stop();
    turns.value = [];
    error.value = null;
  }

  return { turns, isStreaming, error, send, stop, clear };
}
