import { useSyncExternalStore } from 'react';

export type CallKind = 'request' | 'resolved' | 'abort' | 'error';

export interface CallEntry {
  n: number;
  kind: CallKind;
  source: string;
  detail: string;
}

let entries: CallEntry[] = [];
let counter = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function logCall(kind: CallKind, source: string, detail: string) {
  counter += 1;
  entries = [...entries, { n: counter, kind, source, detail }];
  emit();
}

export function clearCallLog() {
  entries = [];
  counter = 0;
  emit();
}

export function useCallLog(): CallEntry[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => entries,
  );
}
