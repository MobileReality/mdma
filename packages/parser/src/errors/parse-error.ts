import type { Point } from 'unist';
import type { ErrorCode } from './error-codes.js';

export class MdmaParseError extends Error {
  readonly code: ErrorCode;
  readonly position?: { start?: Point; end?: Point };

  constructor(message: string, code: ErrorCode, position?: { start?: Point; end?: Point }) {
    super(message);
    this.name = 'MdmaParseError';
    this.code = code;
    this.position = position;
  }
}
