import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { DocumentStore } from '@mdma/runtime';

export interface MdmaContextValue {
  store: DocumentStore;
}

export const MdmaContext = createContext<MdmaContextValue | null>(null);

export function useMdmaContext(): MdmaContextValue {
  const ctx = useContext(MdmaContext);
  if (!ctx) {
    throw new Error('useMdmaContext must be used within a MdmaProvider');
  }
  return ctx;
}

export interface MdmaProviderProps {
  store: DocumentStore;
  children: ReactNode;
}

export function MdmaProvider({ store, children }: MdmaProviderProps) {
  const value = useMemo(() => ({ store }), [store]);
  return <MdmaContext.Provider value={value}>{children}</MdmaContext.Provider>;
}
