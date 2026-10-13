import type { DocumentStore } from './document-store.js';

export async function resolveAllData(store: DocumentStore): Promise<void> {
  await store.resolveAllData();
}
