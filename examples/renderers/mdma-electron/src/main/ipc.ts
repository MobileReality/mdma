import { IPC } from '@shared/ipc';
import { type IpcMainInvokeEvent, type WebContents, ipcMain } from 'electron';
import type { ActionHost } from './actions.js';
import { acceptRendererAuditEntries } from './audit-input.js';
import type { AuditTrail } from './audit.js';
import { streamChat } from './chat.js';
import {
  ChatStartRequestSchema,
  NoArgsSchema,
  RequestIdSchema,
  RunActionRequestSchema,
} from './ipc-schemas.js';

export interface MdmaIpcOptions {
  audit: AuditTrail;
  actionHost: ActionHost;
  isAppUrl: (url: string) => boolean;
}

export function registerMdmaIpc({ audit, actionHost, isAppUrl }: MdmaIpcOptions): void {
  const streams = new Map<string, AbortController>();

  const send = (sender: WebContents, channel: string, payload?: unknown) => {
    if (!sender.isDestroyed()) sender.send(channel, payload);
  };

  const isAppSender = ({ senderFrame }: IpcMainInvokeEvent) =>
    senderFrame !== null && senderFrame.parent === null && isAppUrl(senderFrame.url);

  function handle<T>(
    channel: string,
    parse: (input: unknown) => T,
    run: (event: IpcMainInvokeEvent, input: T) => unknown,
  ) {
    ipcMain.handle(channel, (event, input: unknown) => {
      if (!isAppSender(event)) throw new Error(`Rejected ${channel}: sender is not the app page`);
      return run(event, parse(input));
    });
  }

  handle(IPC.chatStart, ChatStartRequestSchema.parse, async (event, request) => {
    const controller = new AbortController();
    streams.set(request.requestId, controller);
    const { requestId } = request;

    try {
      const full = await streamChat(
        request.messages,
        (chunk, running) => send(event.sender, IPC.chatDelta, { requestId, chunk, full: running }),
        controller.signal,
      );
      send(event.sender, IPC.chatEnd, { requestId, full });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const aborted = error instanceof Error && error.name === 'AbortError';
      if (aborted) {
        send(event.sender, IPC.chatEnd, { requestId, full: '' });
      } else {
        send(event.sender, IPC.chatError, { requestId, message });
      }
    } finally {
      streams.delete(requestId);
    }
  });

  handle(IPC.chatAbort, RequestIdSchema.parse, (_event, requestId) => {
    streams.get(requestId)?.abort();
  });

  handle(IPC.runAction, RunActionRequestSchema.parse, (_event, request) => actionHost.run(request));

  handle(IPC.auditAppend, acceptRendererAuditEntries, (_event, entries) => {
    audit.append(entries);
  });
  handle(IPC.auditList, NoArgsSchema.parse, () => audit.list());
  handle(IPC.auditVerify, NoArgsSchema.parse, () => audit.verify());
  handle(IPC.auditPath, NoArgsSchema.parse, () => audit.filePath);
}

/** Push audit changes to a window, so entries main appends on its own show up too. */
export function forwardAuditChanges(audit: AuditTrail, sender: WebContents): () => void {
  return audit.onChange(() => {
    if (!sender.isDestroyed()) sender.send(IPC.auditChanged);
  });
}
