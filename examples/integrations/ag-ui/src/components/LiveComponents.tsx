import type { MdmaMessageState } from '@mobile-reality/mdma-agui';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import { useMemo } from 'react';
import { primaryComponentId } from '../mdma';

/**
 * The live components panel: one card per component id.
 *
 * Documents are keyed by their primary component id, so when the agent re-renders a component the
 * new document replaces that card instead of appending a second copy.
 */
export function LiveComponents({ documents }: { documents: MdmaMessageState[] }) {
  const cards = useMemo(() => {
    const byId = new Map<string, MdmaMessageState>();
    for (const doc of documents) byId.set(primaryComponentId(doc) ?? doc.messageId, doc);
    return [...byId.entries()];
  }, [documents]);

  return (
    <section className="components">
      <h2>📄 Live components</h2>
      <p className="hint">
        Rendered forms / gates / tables, one card per component id. Updating a component replaces
        its card here instead of stacking copies in the chat.
      </p>

      {cards.length === 0 && (
        <p className="emptyState">Ask for a form, an approval gate, a table, or a checklist.</p>
      )}

      {cards.map(([id, doc]) => (
        <article key={id} className="component-card">
          <div className="component-meta">
            <code>{id}</code>
          </div>
          <MdmaDocument ast={doc.ast} store={doc.store} theme="dark" />
        </article>
      ))}
    </section>
  );
}
