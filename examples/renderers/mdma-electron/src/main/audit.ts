import { appendFileSync } from 'node:fs';
import { ChainedEventLog } from '@mobile-reality/mdma-runtime';
import type {
  ChainedEventLogEntry,
  IntegrityVerificationResult,
} from '@mobile-reality/mdma-runtime';
import type { AuditEntryInput } from '@shared/ipc';

export interface AuditTrailOptions {
  sessionId: string;
  documentId: string;
  filePath: string;
}

export interface AuditTrail {
  append(entries: AuditEntryInput[]): ChainedEventLogEntry[];
  list(): ChainedEventLogEntry[];
  verify(): IntegrityVerificationResult;
  readonly filePath: string;
  onChange(listener: () => void): () => void;
}

/**
 * The hash-chained audit log, owned by the main process. Entries arrive from the
 * renderer (user edits) and from the main-side action host (integration calls),
 * but the chain and the file are written here — so a compromised renderer can
 * neither rewrite history nor forge a link.
 */
export function createAuditTrail({
  sessionId,
  documentId,
  filePath,
}: AuditTrailOptions): AuditTrail {
  const log = new ChainedEventLog(sessionId, documentId);
  const listeners = new Set<() => void>();

  function persist(entry: ChainedEventLogEntry) {
    try {
      appendFileSync(filePath, `${JSON.stringify(entry)}\n`, 'utf8');
    } catch (error) {
      console.error(`[mdma] failed to persist audit entry to ${filePath}`, error);
    }
  }

  return {
    append(entries) {
      const chained = entries.map((entry) => {
        const written = log.append(entry);
        persist(written);
        return written;
      });
      if (chained.length > 0) {
        for (const listener of listeners) listener();
      }
      return chained;
    },

    list() {
      return log.toJSON();
    },

    verify() {
      return log.verifyIntegrity();
    },

    filePath,

    onChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
