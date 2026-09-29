import { isDataSourceRef } from '@mobile-reality/mdma-spec';
import type { DataSlotState } from './data-source-manager.js';

export function isDataDrivenOptions(
  options: unknown,
  dataKey: string,
  getDataState: (key: string) => DataSlotState | undefined,
): boolean {
  if (isDataSourceRef(options)) return true;
  return typeof options === 'string' && getDataState(dataKey) !== undefined;
}
