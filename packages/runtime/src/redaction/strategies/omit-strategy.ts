import type { RedactionStrategy } from './types.js';

export const omitStrategy: RedactionStrategy = {
  name: 'omit',
  redact(_value: unknown): unknown {
    return '[REDACTED]';
  },
};
