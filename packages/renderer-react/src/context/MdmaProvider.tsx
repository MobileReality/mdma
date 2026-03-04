import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';

/** Named collections of select options that form fields can reference by string. */
export type DataSources = Record<string, Array<{ label: string; value: string }>>;

export interface MdmaContextValue {
  store: DocumentStore;
  dataSources?: DataSources;
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
  dataSources?: DataSources;
  children: ReactNode;
}

export function MdmaProvider({ store, dataSources, children }: MdmaProviderProps) {
  const value = useMemo(() => ({ store, dataSources }), [store, dataSources]);
  return <MdmaContext.Provider value={value}>{children}</MdmaContext.Provider>;
}
