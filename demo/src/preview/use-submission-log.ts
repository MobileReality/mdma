import { useSyncExternalStore } from 'react';
import {
  getSubmissionLog,
  subscribeSubmissionLog,
  type SubmissionLogEntry,
} from './insurance-backend.js';

export function useSubmissionLog(): readonly SubmissionLogEntry[] {
  return useSyncExternalStore(subscribeSubmissionLog, getSubmissionLog, getSubmissionLog);
}
