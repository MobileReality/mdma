import type {
  ChainedEventLogEntry,
  IntegrityVerificationResult,
} from '@mobile-reality/mdma-runtime';
import type { EventLogEntry } from '@mobile-reality/mdma-spec';

export const IPC = {
  chatStart: 'mdma:chat:start',
  chatAbort: 'mdma:chat:abort',
  chatDelta: 'mdma:chat:delta',
  chatEnd: 'mdma:chat:end',
  chatError: 'mdma:chat:error',
  runAction: 'mdma:action:run',
  auditAppend: 'mdma:audit:append',
  auditList: 'mdma:audit:list',
  auditVerify: 'mdma:audit:verify',
  auditPath: 'mdma:audit:path',
  auditChanged: 'mdma:audit:changed',
} as const;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatStartRequest {
  requestId: string;
  messages: ChatMessage[];
}

export interface ChatDeltaEvent {
  requestId: string;
  chunk: string;
  full: string;
}

export interface ChatEndEvent {
  requestId: string;
  full: string;
}

export interface ChatErrorEvent {
  requestId: string;
  message: string;
}

export interface RunActionRequest {
  componentId: string;
  actionId: string;
  payload?: unknown;
}

export type RunActionResult =
  | { ok: true; result: unknown }
  | { ok: false; error: string; deniedByPolicy: boolean };

/** An audit entry as the renderer's `DocumentStore` produced it, before main chains it. */
export type AuditEntryInput = Pick<
  EventLogEntry,
  'eventType' | 'componentId' | 'payload' | 'redacted' | 'actor'
>;

export interface MdmaBridge {
  chat: {
    start(request: ChatStartRequest): Promise<void>;
    abort(requestId: string): Promise<void>;
    onDelta(listener: (event: ChatDeltaEvent) => void): () => void;
    onEnd(listener: (event: ChatEndEvent) => void): () => void;
    onError(listener: (event: ChatErrorEvent) => void): () => void;
  };
  actions: {
    run(request: RunActionRequest): Promise<RunActionResult>;
  };
  audit: {
    append(entries: AuditEntryInput[]): Promise<void>;
    list(): Promise<ChainedEventLogEntry[]>;
    verify(): Promise<IntegrityVerificationResult>;
    path(): Promise<string>;
    onChanged(listener: () => void): () => void;
  };
}
