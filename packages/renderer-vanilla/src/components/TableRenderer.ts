import { isDataSourceRef, type TableColumn, type TableComponent } from '@mobile-reality/mdma-spec';
import { el } from '../dom/el.js';
import { withState } from '../renderers/renderer-props.js';
import type { MdmaBlockRendererProps } from '../renderers/renderer-props.js';
import { renderDataLoading, renderDataError, renderDataEmpty } from './data-state-views.js';

const MASK = '•••••';

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

function tableBody(
  component: TableComponent,
  rows: unknown[],
  resolveBinding: ((expr: string) => unknown) | undefined,
  revealed: Set<string>,
  sort: { key: string; direction: 'asc' | 'desc' } | undefined,
  onSort: ((key: string) => void) | undefined,
): HTMLElement {
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
          component.columns.map((column: TableColumn) =>
            el(
              'th',
              {
                style: column.width ? { width: String(column.width) } : undefined,
                class: onSort && column.sortable ? 'mdma-table-sortable' : undefined,
                on:
                  onSort && column.sortable ? { click: () => onSort(column.key) } : undefined,
              },
              [
                column.header,
                sort?.key === column.key
                  ? sort.direction === 'asc'
                    ? ' ↑'
                    : ' ↓'
                  : '',
                column.sensitive &&
                  el('span', { class: 'mdma-sensitive-badge', title: 'Sensitive column (PII)' }, [
                    '\u{1F512}',
                  ]),
              ],
            ),
          ),
        ),
      ]),
      el('tbody', {}, [
        ...rows.map((row, rowIndex) =>
          el(
            'tr',
            {},
            component.columns.map((column: TableColumn) => {
              const cell = (row as Record<string, unknown>)[column.key] ?? '';
              const resolved =
                resolveBinding && typeof cell === 'string' && /^\{\{.+\}\}$/.test(cell)
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
}

function dataDrivenTable(props: MdmaBlockRendererProps, component: TableComponent): HTMLElement {
  const state = props.getDataState(component.id);

  if (!state || state.status === 'loading') {
    return renderDataLoading(props.context, 'table', component.id);
  }
  if (state.status === 'error') {
    return renderDataError(props.context, 'table', component.id, state.error ?? 'Failed to load data', () =>
      props.retryData(component.id),
    );
  }
  if (state.rows.length === 0) {
    return renderDataEmpty(props.context, 'table', component.id);
  }

  const pageSize = component.pageSize ?? state.pageSize ?? state.rows.length;
  const total = state.total ?? state.rows.length;
  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  const onSort = (key: string) => {
    const next =
      state.sort?.key === key && state.sort.direction === 'asc'
        ? { key, direction: 'desc' as const }
        : { key, direction: 'asc' as const };
    props.setDataSort(component.id, next);
  };

  const body = tableBody(component, state.rows, undefined, new Set(), state.sort, onSort);

  const pagination =
    pageCount > 1
      ? el('div', { class: 'mdma-table-pagination' }, [
          el(
            'button',
            {
              type: 'button',
              disabled: state.page <= 1,
              on: { click: () => props.setDataPage(component.id, state.page - 1) },
            },
            ['Prev'],
          ),
          el('span', {}, [`Page ${state.page} / ${pageCount}`]),
          el(
            'button',
            {
              type: 'button',
              disabled: state.page >= pageCount,
              on: { click: () => props.setDataPage(component.id, state.page + 1) },
            },
            ['Next'],
          ),
        ])
      : undefined;

  return el('div', {}, [body, pagination]);
}

export const TableRenderer = withState<Set<string>>(
  () => new Set(),
  (props, revealed) => {
    const { component, resolveBinding } = props;
    if (component.type !== 'table') return el('div');

    if (isDataSourceRef(component.data)) {
      return dataDrivenTable(props, component);
    }

    const raw =
      typeof component.data === 'string' ? resolveBinding(component.data) : component.data;
    const rows = Array.isArray(raw) ? raw : [];

    return tableBody(component, rows, resolveBinding, revealed, undefined, undefined);
  },
);
