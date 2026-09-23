import { EventLogEntrySchema, type EventType } from '@mobile-reality/mdma-spec';
import type { AuditEntryInput } from '@shared/ipc';
import { z } from 'zod';

export const MAIN_OWNED_EVENT_TYPES: ReadonlySet<EventType> = new Set(['integration_called']);

export const RendererAuditEntrySchema = EventLogEntrySchema.pick({
  eventType: true,
  componentId: true,
  payload: true,
  redacted: true,
  actor: true,
}).refine((entry) => !MAIN_OWNED_EVENT_TYPES.has(entry.eventType), {
  message: 'Event type is produced by the main process and cannot be forwarded',
  path: ['eventType'],
});

export const RendererAuditBatchSchema = z.array(RendererAuditEntrySchema);

export function acceptRendererAuditEntries(input: unknown): AuditEntryInput[] {
  return RendererAuditBatchSchema.parse(input);
}
