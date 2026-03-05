import type { RedactionStrategy } from './types.js';

export const maskStrategy: RedactionStrategy = {
  name: 'mask',
  redact(value: unknown): unknown {
    const str = String(value);
    if (str.length <= 3) return '***';
    const visible = Math.min(3, Math.floor(str.length / 3));
    return `${str.slice(0, visible)}***`;
  },
};
