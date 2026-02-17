import { hashValue } from '../hash.js';
import type { RedactionStrategy } from './types.js';

export const hashStrategy: RedactionStrategy = {
  name: 'hash',
  redact(value: unknown): unknown {
    return hashValue(value);
  },
};
