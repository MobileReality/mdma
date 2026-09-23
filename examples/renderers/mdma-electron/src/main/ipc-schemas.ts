import type { ChatStartRequest, RunActionRequest } from '@shared/ipc';
import { z } from 'zod';

export const CHAT_ROLES = ['system', 'user', 'assistant'] as const;
export const ChatRoleSchema = z.enum(CHAT_ROLES);

export const RequestIdSchema = z.string().min(1);

export const ChatStartRequestSchema: z.ZodType<ChatStartRequest> = z.object({
  requestId: RequestIdSchema,
  messages: z.array(z.object({ role: ChatRoleSchema, content: z.string() })),
});

export const RunActionRequestSchema: z.ZodType<RunActionRequest> = z.object({
  componentId: z.string(),
  actionId: z.string(),
  payload: z.unknown().optional(),
});

export const NoArgsSchema = z.undefined();
