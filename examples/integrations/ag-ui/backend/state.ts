/**
 * Per-thread memory. Two things are remembered between turns:
 *
 *  - `components` — the AG-UI shared state (componentId → field values). MDMA components are
 *    headless, so this is the source of truth they render from. `profile` holds user info.
 *  - `docs` — the last MDMA document rendered for each component. MDMA is delivered out-of-band on
 *    CUSTOM events, so it never appears in the message history; without this the model can't see
 *    what's already on screen and would invent a near-duplicate instead of updating it.
 */
import { formHydration } from './mdma';

export interface ThreadState {
  components: Record<string, Record<string, unknown>>;
  docs: Record<string, string>;
}

const threads = new Map<string, ThreadState>();

export function getThread(threadId: string): ThreadState {
  const existing = threads.get(threadId);
  if (existing) return existing;
  const fresh: ThreadState = { components: {}, docs: {} };
  threads.set(threadId, fresh);
  return fresh;
}

export type Profile = { email?: string; name?: string };

export const profileOf = (state: ThreadState): Profile =>
  (state.components.profile ?? {}) as Profile;

/** Merge field values into one component's shared state. */
export function mergeValues(
  state: ThreadState,
  componentId: string,
  values: Record<string, unknown>,
): void {
  state.components[componentId] = { ...(state.components[componentId] ?? {}), ...values };
}

/** Pre-fill a single document's form from the profile. Returns whether anything changed. */
export function hydrateDoc(state: ThreadState, doc: string): boolean {
  const form = formHydration(doc, profileOf(state));
  if (!form) return false;
  mergeValues(state, form.id, form.values);
  return true;
}

/** Re-apply the profile to every already-rendered form. Returns whether anything changed. */
export function hydrateRenderedDocs(state: ThreadState): boolean {
  let changed = false;
  for (const doc of Object.values(state.docs)) {
    if (hydrateDoc(state, doc)) changed = true;
  }
  return changed;
}
