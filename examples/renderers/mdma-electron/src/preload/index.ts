import {
  type AuditEntryInput,
  type ChatStartRequest,
  IPC,
  type MdmaBridge,
  type RunActionRequest,
} from '@shared/ipc';
import { type IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T) => listener(payload);
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.off(channel, handler);
  };
}

const bridge: MdmaBridge = {
  chat: {
    start: (request: ChatStartRequest) => ipcRenderer.invoke(IPC.chatStart, request),
    abort: (requestId: string) => ipcRenderer.invoke(IPC.chatAbort, requestId),
    onDelta: (listener) => subscribe(IPC.chatDelta, listener),
    onEnd: (listener) => subscribe(IPC.chatEnd, listener),
    onError: (listener) => subscribe(IPC.chatError, listener),
  },
  actions: {
    run: (request: RunActionRequest) => ipcRenderer.invoke(IPC.runAction, request),
  },
  audit: {
    append: (entries: AuditEntryInput[]) => ipcRenderer.invoke(IPC.auditAppend, entries),
    list: () => ipcRenderer.invoke(IPC.auditList),
    verify: () => ipcRenderer.invoke(IPC.auditVerify),
    path: () => ipcRenderer.invoke(IPC.auditPath),
    onChanged: (listener) => subscribe(IPC.auditChanged, () => listener()),
  },
};

contextBridge.exposeInMainWorld('mdma', bridge);
