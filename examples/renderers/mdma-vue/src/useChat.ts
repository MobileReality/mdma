import { markRaw, ref } from 'vue';
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

  /**
   * Replace the turn with matching id by a NEW object. Mutating a turn in place
   * wouldn't re-render its keyed `<ChatMessage>`: Vue compares the prop by
   * reference and skips the patch when the object identity is unchanged.
   */
  function patchTurn(id: number, patch: Partial<Turn>) {
    turns.value = turns.value.map((t) => (t.id === id ? { ...t, ...patch } : t));
  }

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
    turns.value = [...turns.value, { id: nextId++, role: 'user', content: trimmed }];

    const assistantId = nextId++;
    turns.value = [...turns.value, { id: assistantId, role: 'assistant', content: '' }];

    isStreaming.value = true;
    controller = new AbortController();

    // The assistant's store persists across chunks (re-parsed via updateAst so
    // in-progress form values survive); it's kept out of the reactive graph and
    // `markRaw`d into the turn, so Vue never proxies the store or the AST.
    let store: DocumentStore | null = null;

    // Parsing on every token is wasteful, and parsing is async — two chunks
    // racing would each create a store. A coalescing runner solves both: chunks
    // mark the latest text dirty, and one worker parses it, always finishing on
    // the final text so the last chunk is never dropped.
    let pending: string | null = null;
    let running: Promise<void> | null = null;

    const parseLatest = async () => {
      while (pending !== null) {
        const markdown = pending;
        pending = null;
        let ast: MdmaRoot;
        if (!store) {
          const parsed = await parseDocument(markdown);
          store = markRaw(parsed.store);
          ast = parsed.ast;
        } else {
          ast = await reparseInto(store, markdown);
        }
        patchTurn(assistantId, { ast: markRaw(ast), store });
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
          patchTurn(assistantId, { content: full });
          void scheduleParse(full);
        },
        controller.signal,
      );
      // Ensure the final text is parsed even if a chunk landed mid-parse.
      await scheduleParse(turns.value.find((t) => t.id === assistantId)?.content ?? '');
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
