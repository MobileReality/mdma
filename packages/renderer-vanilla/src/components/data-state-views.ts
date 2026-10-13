import { resolveElementOverride } from '../context/render-context.js';
import type { RenderContext } from '../context/render-context.js';
import { el } from '../dom/el.js';

export function renderDataLoading(
  context: RenderContext,
  scope: string,
  componentId: string,
  reloading = false,
): HTMLElement {
  const override = resolveElementOverride<{ componentId: string; reloading?: boolean }>(
    context,
    scope,
    'dataLoading',
  );
  if (override) return override({ componentId, reloading }).el;
  if (reloading) {
    return el(
      'span',
      { class: 'mdma-table-loading-indicator', dataset: { 'component-id': componentId } },
      ['Loading…'],
    );
  }
  return el('div', { class: 'mdma-data-loading', dataset: { 'component-id': componentId } }, [
    'Loading…',
  ]);
}

export function renderDataError(
  context: RenderContext,
  scope: string,
  componentId: string,
  error: string,
  onRetry: () => void,
): HTMLElement {
  const override = resolveElementOverride<{
    componentId: string;
    error: string;
    onRetry: () => void;
  }>(context, scope, 'dataError');
  if (override) return override({ componentId, error, onRetry }).el;
  return el('div', { class: 'mdma-data-error', dataset: { 'component-id': componentId } }, [
    el('span', {}, [error]),
    el('button', { type: 'button', on: { click: onRetry } }, ['Retry']),
  ]);
}

export function renderDataEmpty(
  context: RenderContext,
  scope: string,
  componentId: string,
): HTMLElement {
  const override = resolveElementOverride<{ componentId: string }>(context, scope, 'dataEmpty');
  if (override) return override({ componentId }).el;
  return el('div', { class: 'mdma-data-empty', dataset: { 'component-id': componentId } }, [
    'No data',
  ]);
}
