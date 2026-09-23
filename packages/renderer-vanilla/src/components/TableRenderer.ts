import { el } from '../dom/el.js';
import { withState } from '../renderers/renderer-props.js';

const MASK = '•••••';

/** A PII cell, masked until the reader clicks it. Toggles in place — no re-render. */
function maskedCell(value: string, key: string, revealed: Set<string>): HTMLElement {
  const isRevealed = () => revealed.has(key);

  const span = el('span', {
    class: 'mdma-table-cell--sensitive',
    title: isRevealed() ? 'Click to mask' : 'Click to reveal',
    on: {
      click: () => {
        if (isRevealed()) revealed.delete(key);
        else revealed.add(key);
        span.textContent = isRevealed() ? value : MASK;
        span.setAttribute('title', isRevealed() ? 'Click to mask' : 'Click to reveal');
      },
    },
  });
  span.textContent = isRevealed() ? value : MASK;
  return span;
}

export const TableRenderer = withState<Set<string>>(
  () => new Set(),
  ({ component, resolveBinding }, revealed) => {
    if (component.type !== 'table') return el('div');

    const raw =
      typeof component.data === 'string' ? resolveBinding(component.data) : component.data;
    const rows = Array.isArray(raw) ? raw : [];
    const sensitiveKeys = new Set(
      component.columns.filter((column) => column.sensitive).map((column) => column.key),
    );

    return el('div', { class: 'mdma-table', dataset: { 'component-id': component.id } }, [
      component.label && el('h3', { class: 'mdma-table-label' }, [component.label]),
      el('table', {}, [
        el('thead', {}, [
          el(
            'tr',
            {},
            component.columns.map((column) =>
              el('th', { style: column.width ? { width: String(column.width) } : undefined }, [
                column.header,
                column.sensitive &&
                  el('span', { class: 'mdma-sensitive-badge', title: 'Sensitive column (PII)' }, [
                    '\u{1F512}',
                  ]),
              ]),
            ),
          ),
        ]),
        el('tbody', {}, [
          ...rows.map((row, rowIndex) =>
            el(
              'tr',
              {},
              component.columns.map((column) => {
                const cell = (row as Record<string, unknown>)[column.key] ?? '';
                // A cell may itself hold a binding expression, e.g. "{{user.name}}".
                const resolved =
                  typeof cell === 'string' && /^\{\{.+\}\}$/.test(cell)
                    ? resolveBinding(cell)
                    : cell;
                const value = String(resolved ?? '');
                return el('td', {}, [
                  sensitiveKeys.has(column.key) && value
                    ? maskedCell(value, `${rowIndex}:${column.key}`, revealed)
                    : value,
                ]);
              }),
            ),
          ),
          rows.length === 0 &&
            el('tr', {}, [
              el('td', { colspan: component.columns.length, class: 'mdma-table-empty' }, [
                'No data',
              ]),
            ]),
        ]),
      ]),
    ]);
  },
);
