import { EventLogEntrySchema, type EventType } from '@mobile-reality/mdma-spec';
import type { AuditEntryInput } from '@shared/ipc';
import { z } from 'zod';

export const MAIN_OWNED_EVENT_TYPES = ['integration_called'] as const satisfies readonly EventType[];

const isMainOwned = (eventType: EventType) =>
  (MAIN_OWNED_EVENT_TYPES as readonly EventType[]).includes(eventType);

export const RendererAuditEntrySchema = EventLogEntrySchema.pick({
  eventType: true,
  componentId: true,
  payload: true,
  redacted: true,
  actor: true,
}).refine((entry) => !isMainOwned(entry.eventType), {
  message: 'Event type is produced by the main process and cannot be forwarded',
  path: ['eventType'],
});

export const RendererAuditBatchSchema = z.array(RendererAuditEntrySchema);

export function acceptRendererAuditEntries(input: unknown): AuditEntryInput[] {
  return RendererAuditBatchSchema.parse(input);
}
