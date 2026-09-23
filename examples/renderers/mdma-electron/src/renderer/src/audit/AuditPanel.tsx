import type { ChainedEventLogEntry } from '@mobile-reality/mdma-runtime';
import { useAudit } from './use-audit.js';

function describe(entry: ChainedEventLogEntry): string {
  const { payload, redacted } = entry;
  const text = (value: unknown) => (value == null ? '' : String(value));

  switch (entry.eventType) {
    case 'field_changed':
      // The field name is not sensitive; a sensitive value arrives hashed, so
      // show a redaction marker rather than the hash.
      return `${text(payload.field)} = ${redacted ? '•••' : text(payload.value)}`;
    case 'action_triggered':
      return `→ ${text(payload.actionId)}`;
    case 'integration_called':
      return payload.error
        ? `${text(payload.integrationId)} ✕ ${text(payload.error)}`
        : `${text(payload.integrationId)} ✓`;
    case 'approval_granted':
    case 'approval_denied':
      return text((payload.actor as { id?: string } | undefined)?.id);
    default:
      return '';
  }
}

export function AuditPanel() {
  const { entries, integrity, filePath } = useAudit();

  return (
    <aside className="audit">
      <header className="audit__header">
        <h2>Audit chain</h2>
        <span className={`audit__badge audit__badge--${integrity?.valid === false ? 'bad' : 'ok'}`}>
          {integrity?.valid === false ? `broken at ${integrity.brokenAt}` : 'intact'}
        </span>
      </header>
      <p className="audit__path" title={filePath}>
        {entries.length} entries · main process · {filePath}
      </p>

      <ol className="audit__list">
        {entries
          .slice()
          .reverse()
          .map((entry) => (
            <li key={entry.hash} className="audit__entry">
              <span className="audit__seq">#{entry.sequence}</span>
              <span className="audit__type">{entry.eventType}</span>
              <span className="audit__component">{entry.componentId}</span>
              <span className="audit__detail">{describe(entry)}</span>
              <span className="audit__hash">
                {entry.previousHash} → {entry.hash}
              </span>
            </li>
          ))}
        {entries.length === 0 && <li className="audit__empty">No events yet.</li>}
      </ol>
    </aside>
  );
}
