import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import type { Turn } from './use-chat.js';

export function ChatMessage({ turn }: { turn: Turn }) {
  if (turn.role === 'user') {
    return (
      <article className="message message--user">
        <p>{turn.content}</p>
      </article>
    );
  }

  return (
    <article className="message message--assistant">
      {turn.ast && turn.store ? (
        <MdmaDocument ast={turn.ast} store={turn.store} theme="auto" />
      ) : (
        <p className="message__placeholder">…</p>
      )}
    </article>
  );
}
