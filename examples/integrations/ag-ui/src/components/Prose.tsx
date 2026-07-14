import { parseMdma } from '@mobile-reality/mdma-agui';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import { useEffect, useState } from 'react';

type Parsed = Awaited<ReturnType<typeof parseMdma>>;

/**
 * The agent's plain replies, rendered through MDMA so markdown (lists, bold) comes out formatted
 * rather than as raw text. Falls back to the raw string until the parse resolves.
 */
export function Prose({ text }: { text: string }) {
  const [doc, setDoc] = useState<Parsed | null>(null);

  useEffect(() => {
    let alive = true;
    parseMdma(text)
      .then((parsed) => {
        if (alive) setDoc(parsed);
      })
      .catch(() => {
        // Unparseable — the raw-text fallback below is fine.
      });
    return () => {
      alive = false;
    };
  }, [text]);

  if (!doc) return <span className="prose">{text}</span>;
  return <MdmaDocument ast={doc.ast} store={doc.store} theme="dark" />;
}
