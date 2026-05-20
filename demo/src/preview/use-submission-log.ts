import { useSyncExternalStore } from 'react';
import {
  getSubmissionLog,
  subscribeSubmissionLog,
  type SubmissionLogEntry,
} from './insurance-backend.js';

/**
 * Reactive read of the mock backend's submission log. The store lives in
 * `insurance-backend.ts` (module-level array + subscriber set); this hook
 * re-renders any consumer whenever a new submission is recorded.
 */
export function useSubmissionLog(): readonly SubmissionLogEntry[] {
  return useSyncExternalStore(subscribeSubmissionLog, getSubmissionLog, getSubmissionLog);
}
