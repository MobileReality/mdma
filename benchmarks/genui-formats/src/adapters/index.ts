import { a2uiAdapter } from './a2ui.js';
import { a2uiTransportAdapter } from './a2ui-transport.js';
import { jsonRenderAdapter } from './json-render.js';
import { mdmaAdapter } from './mdma.js';
import { openuiV2Adapter } from './openui-v2.js';
import { openuiAdapter } from './openui.js';
import type { FormatAdapter } from './types.js';

export const ADAPTERS: FormatAdapter[] = [
  mdmaAdapter,
  openuiV2Adapter,
  jsonRenderAdapter,
  a2uiTransportAdapter,
  a2uiAdapter,
  openuiAdapter,
];

export const ADAPTER_BY_ID = Object.fromEntries(ADAPTERS.map((a) => [a.id, a])) as Record<
  FormatAdapter['id'],
  FormatAdapter
>;

export type { FormatAdapter, ValidationResult, ValidationIssue, FailureKind } from './types.js';
