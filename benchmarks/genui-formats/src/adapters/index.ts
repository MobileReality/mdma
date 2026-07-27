import { a2uiAdapter } from './a2ui.js';
import { a2uiTransportAdapter } from './a2ui-transport.js';
import { jsonRenderAdapter } from './json-render.js';
import { mdmaAdapter } from './mdma.js';
import { openuiAdapter } from './openui.js';
import type { FormatAdapter } from './types.js';

export const ADAPTERS: FormatAdapter[] = [
  mdmaAdapter,
  openuiAdapter,
  jsonRenderAdapter,
  a2uiAdapter,
  a2uiTransportAdapter,
];

export const ADAPTER_BY_ID = Object.fromEntries(ADAPTERS.map((a) => [a.id, a])) as Record<
  FormatAdapter['id'],
  FormatAdapter
>;

export type { FormatAdapter, ValidationResult, ValidationIssue, FailureKind } from './types.js';
