import { z } from 'zod';

export const EventTypeSchema = z.enum([
  'component_rendered',
  'field_changed',
  'action_triggered',
  'integration_called',
  'approval_granted',
  'approval_denied',
  'validation_error',
  'policy_violation',
]);

export type EventType = z.infer<typeof EventTypeSchema>;

export const EventActorSchema = z.object({
  id: z.string(),
  role: z.string().optional(),
});

export type EventActor = z.infer<typeof EventActorSchema>;

export const EventLogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  sessionId: z.string().uuid(),
  documentId: z.string(),
  eventType: EventTypeSchema,
  componentId: z.string(),
  payload: z.record(z.unknown()),
  redacted: z.boolean().default(false),
  actor: EventActorSchema.optional(),
});

export type EventLogEntry = z.infer<typeof EventLogEntrySchema>;
