import type { DocumentStore } from '@mobile-reality/mdma-runtime';

/**
 * Ship this store's new audit entries to the main process, which chains and
 * persists them. `integration_called` is skipped: the action host in main
 * appends its own entry for every call it runs, and that one is authoritative —
 * forwarding the renderer's copy too would double every integration.
 */
export function forwardAudit(store: DocumentStore): () => void {
  let forwarded = 0;

  const flush = () => {
    const entries = store.getEventLog().entries();
    if (entries.length <= forwarded) return;

    const fresh = entries
      .slice(forwarded)
      .filter((entry) => entry.eventType !== 'integration_called')
      .map(({ eventType, componentId, payload, redacted, actor }) => ({
        eventType,
        componentId,
        payload,
        redacted,
        actor,
      }));

    forwarded = entries.length;
    if (fresh.length > 0) void window.mdma.audit.append(fresh);
  };

  flush();
  return store.subscribe(flush);
}
