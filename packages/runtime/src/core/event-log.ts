import type { EventLogEntry, EventType, EventActor } from '@mobile-reality/mdma-spec';

export interface EventLogOptions {
  sessionId: string;
  documentId: string;
}

export interface AppendOnlyEventLog {
  append(entry: {
    eventType: EventType;
    componentId: string;
    payload: Record<string, unknown>;
    redacted?: boolean;
    actor?: EventActor;
  }): EventLogEntry;
  entries(): ReadonlyArray<Readonly<EventLogEntry>>;
  forComponent(componentId: string): EventLogEntry[];
  size(): number;
}

export function createEventLog(options: EventLogOptions): AppendOnlyEventLog {
  const log: EventLogEntry[] = [];

  return {
    append(entry) {
      const full: EventLogEntry = {
        timestamp: new Date().toISOString(),
        sessionId: options.sessionId,
        documentId: options.documentId,
        eventType: entry.eventType,
        componentId: entry.componentId,
        payload: entry.payload,
        redacted: entry.redacted ?? false,
        actor: entry.actor,
      };
      log.push(full);
      return full;
    },

    entries() {
      return log;
    },

    forComponent(componentId) {
      return log.filter((e) => e.componentId === componentId);
    },

    size() {
      return log.length;
    },
  };
}
