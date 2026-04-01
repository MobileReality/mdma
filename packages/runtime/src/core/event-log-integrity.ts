import type { EventLogEntry } from '@mobile-reality/mdma-spec';

export interface ChainedEventLogEntry extends EventLogEntry {
  sequence: number;
  previousHash: string;
  hash: string;
}

const GENESIS_HASH = '0000000000000000';

/** Simple hash function for log chain integrity (non-cryptographic) */
function computeHash(data: string): string {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = (hash * 0x01000193) | 0; // FNV prime
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function hashEntry(entry: ChainedEventLogEntry): string {
  const data = JSON.stringify({
    sequence: entry.sequence,
    previousHash: entry.previousHash,
    timestamp: entry.timestamp,
    sessionId: entry.sessionId,
    documentId: entry.documentId,
    eventType: entry.eventType,
    componentId: entry.componentId,
    payload: entry.payload,
    redacted: entry.redacted,
  });
  return computeHash(data);
}

export interface IntegrityVerificationResult {
  valid: boolean;
  brokenAt?: number;
  reason?: string;
}

export class ChainedEventLog {
  private entries: ChainedEventLogEntry[] = [];
  private sessionId: string;
  private documentId: string;

  constructor(sessionId: string, documentId: string) {
    this.sessionId = sessionId;
    this.documentId = documentId;
  }

  append(entry: {
    eventType: EventLogEntry['eventType'];
    componentId: string;
    payload: Record<string, unknown>;
    redacted?: boolean;
    actor?: EventLogEntry['actor'];
  }): ChainedEventLogEntry {
    const sequence = this.entries.length;
    const previousHash = sequence === 0 ? GENESIS_HASH : this.entries[sequence - 1].hash;

    const chained: ChainedEventLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      documentId: this.documentId,
      eventType: entry.eventType,
      componentId: entry.componentId,
      payload: entry.payload,
      redacted: entry.redacted ?? false,
      actor: entry.actor,
      sequence,
      previousHash,
      hash: '', // computed below
    };

    chained.hash = hashEntry(chained);
    this.entries.push(chained);
    return chained;
  }

  verifyIntegrity(): IntegrityVerificationResult {
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Verify chain link
      const expectedPrev = i === 0 ? GENESIS_HASH : this.entries[i - 1].hash;
      if (entry.previousHash !== expectedPrev) {
        return {
          valid: false,
          brokenAt: i,
          reason: `Chain broken at entry ${i}: expected previousHash "${expectedPrev}", got "${entry.previousHash}"`,
        };
      }

      // Verify hash
      const expectedHash = hashEntry(entry);
      if (entry.hash !== expectedHash) {
        return {
          valid: false,
          brokenAt: i,
          reason: `Hash mismatch at entry ${i}: expected "${expectedHash}", got "${entry.hash}"`,
        };
      }
    }

    return { valid: true };
  }

  toJSON(): ChainedEventLogEntry[] {
    return [...this.entries];
  }

  toJSONL(): string {
    return this.entries.map((e) => JSON.stringify(e)).join('\n');
  }

  forComponent(componentId: string): ChainedEventLogEntry[] {
    return this.entries.filter((e) => e.componentId === componentId);
  }

  get size(): number {
    return this.entries.length;
  }
}
