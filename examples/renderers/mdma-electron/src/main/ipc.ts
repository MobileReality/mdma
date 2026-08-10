import {
  type AuditEntryInput,
  type ChatStartRequest,
  IPC,
  type RunActionRequest,
} from '@shared/ipc';
import { type WebContents, ipcMain } from 'electron';
import type { ActionHost } from './actions.js';
import type { AuditTrail } from './audit.js';
import { streamChat } from './chat.js';

export interface MdmaIpcOptions {
  audit: AuditTrail;
  actionHost: ActionHost;
}

export function registerMdmaIpc({ audit, actionHost }: MdmaIpcOptions): void {
  const streams = new Map<string, AbortController>();

  const send = (sender: WebContents, channel: string, payload?: unknown) => {
    if (!sender.isDestroyed()) sender.send(channel, payload);
  };

  ipcMain.handle(IPC.chatStart, async (event, request: ChatStartRequest) => {
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

  ipcMain.handle(IPC.chatAbort, (_event, requestId: string) => {
    streams.get(requestId)?.abort();
  });

  ipcMain.handle(IPC.runAction, (_event, request: RunActionRequest) => actionHost.run(request));

  ipcMain.handle(IPC.auditAppend, (_event, entries: AuditEntryInput[]) => {
    audit.append(entries);
  });
  ipcMain.handle(IPC.auditList, () => audit.list());
  ipcMain.handle(IPC.auditVerify, () => audit.verify());
  ipcMain.handle(IPC.auditPath, () => audit.filePath);
}

/** Push audit changes to a window, so entries main appends on its own show up too. */
export function forwardAuditChanges(audit: AuditTrail, sender: WebContents): () => void {
  return audit.onChange(() => {
    if (!sender.isDestroyed()) sender.send(IPC.auditChanged);
  });
}
