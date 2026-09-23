import { el } from '../dom/el.js';

/** Pull a component type hint out of partial YAML (e.g. "type: form"). */
export function extractTypeHint(yaml?: string): string | null {
  if (!yaml) return null;
  const match = yaml.match(/^\s*type:\s*(\S+)/m);
  return match ? match[1] : null;
}

/**
 * Skeleton for an `mdma` fence that hasn't finished streaming (or failed
 * validation). The hint comes from the partial YAML so the placeholder can name
 * what is arriving instead of showing a generic spinner.
 */
export function renderBlockLoading(node: { value?: string }): HTMLElement {
  const hint = extractTypeHint(node.value);

  return el('div', { class: 'mdma-block-loading' }, [
    el('div', { class: 'mdma-block-loading-shimmer' }),
    el('div', { class: 'mdma-block-loading-content' }, [
      el('span', { class: 'mdma-block-loading-icon' }),
      el('span', { class: 'mdma-block-loading-text' }, [
        hint ? `Loading ${hint} component...` : 'Loading component...',
      ]),
    ]),
  ]);
}
