import type { MdmaMessageState } from '@mobile-reality/mdma-agui';
import type { RefObject } from 'react';
import { primaryComponentId } from '../mdma';
import { Prose } from './Prose';

export type Turn =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; messageId: string };

interface TranscriptProps {
  turns: Turn[];
  documents: MdmaMessageState[];
  texts: Record<string, string>;
  scrollRef: RefObject<HTMLDivElement | null>;
}

/**
 * The conversation. Rendered components are only *referenced* here with a chip — they live in the
 * panel beside it, so the thread stays readable instead of stacking copies of a form.
 */
export function Transcript({ turns, documents, texts, scrollRef }: TranscriptProps) {
  return (
    <div className="transcript" ref={scrollRef}>
      {turns.length === 0 && (
        <p className="empty">Say hi, try "make me a signup form", or hit ▶ Play demo above.</p>
      )}

      {turns.map((turn) => {
        if (turn.kind === 'user') {
          return (
            <div key={turn.id} className="bubble user">
              {turn.text}
            </div>
          );
        }

        const doc = documents.find((d) => d.messageId === turn.messageId);
        if (doc) {
          return (
            <div key={turn.id} className="bubble assistant chip">
              📄 rendered <code>{primaryComponentId(doc) ?? 'component'}</code> — see the panel →
            </div>
          );
        }

        const text = texts[turn.messageId];
        return (
          <div key={turn.id} className="bubble assistant">
            {text ? <Prose text={text} /> : <em>…</em>}
          </div>
        );
      })}
    </div>
  );
}
