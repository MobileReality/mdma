import { defineComponent, h, ref } from 'vue';
import { isDataSourceRef, type TableColumn, type TableComponent } from '@mobile-reality/mdma-spec';
import { blockRendererProps } from '../renderers/renderer-props.js';
import { useDataState, useDocumentStore } from '../composables/use-document-store.js';
import { useElementOverride } from '../context/ElementOverridesContext.js';
import { DefaultDataLoading, DefaultDataError, DefaultDataEmpty } from './DataStateViews.js';

const MaskedCell = defineComponent({
  name: 'MdmaMaskedCell',
  props: {
    value: { type: String, required: true },
  },
  setup(props) {
    const revealed = ref(false);
    return () =>
      h(
        'span',
        {
          class: 'mdma-table-cell--sensitive',
          title: revealed.value ? 'Click to mask' : 'Click to reveal',
          onClick: () => {
            revealed.value = !revealed.value;
          },
        },
        revealed.value ? props.value : '•••••',
      );
  },
});

function renderTableBody(
  component: TableComponent,
  data: unknown[],
  resolveBinding: ((expr: string) => unknown) | undefined,
  sort: { key: string; direction: 'asc' | 'desc' } | undefined,
  onSort: ((key: string) => void) | undefined,
) {
  const sensitiveKeys = new Set(
    component.columns.filter((col) => col.sensitive).map((col) => col.key),
  );

  return h('div', { class: 'mdma-table', 'data-component-id': component.id }, [
    component.label ? h('h3', { class: 'mdma-table-label' }, component.label) : null,
    h('table', [
      h('thead', [
        h(
          'tr',
          component.columns.map((col: TableColumn) =>
            h(
              'th',
              {
                key: col.key,
                style: col.width ? { width: col.width } : undefined,
                class: onSort && col.sortable ? 'mdma-table-sortable' : undefined,
                onClick: onSort && col.sortable ? () => onSort(col.key) : undefined,
              },
              [
                col.header,
                sort?.key === col.key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : null,
                col.sensitive
                  ? h(
                      'span',
                      { class: 'mdma-sensitive-badge', title: 'Sensitive column (PII)' },
                      '\u{1F512}',
                    )
                  : null,
              ],
            ),
          ),
        ),
      ]),
      h('tbody', [
        ...data.map((row, i) =>
          h(
            'tr',
            { key: i },
            component.columns.map((col: TableColumn) => {
              const raw = (row as Record<string, unknown>)[col.key] ?? '';
              const resolved =
                resolveBinding && typeof raw === 'string' && /^\{\{.+\}\}$/.test(raw)
                  ? resolveBinding(raw)
                  : raw;
              const cellValue = String(resolved ?? '');
              return h(
                'td',
                { key: col.key },
                sensitiveKeys.has(col.key) && cellValue
                  ? h(MaskedCell, { value: cellValue })
                  : cellValue,
              );
            }),
          ),
        ),
        data.length === 0
          ? h('tr', [
              h('td', { colspan: component.columns.length, class: 'mdma-table-empty' }, 'No data'),
            ])
          : null,
      ]),
    ]),
  ]);
}

const DataDrivenTable = defineComponent({
  name: 'MdmaDataDrivenTable',
  props: {
    component: { type: Object, required: true },
  },
  setup(props) {
    const store = useDocumentStore();
    const dataState = useDataState(() => (props.component as TableComponent).id);
    const DataLoading = useElementOverride('table', 'dataLoading');
    const DataError = useElementOverride('table', 'dataError');
    const DataEmpty = useElementOverride('table', 'dataEmpty');

    return () => {
      const component = props.component as TableComponent;
      const state = dataState.value;

      const isReloading = state?.status === 'loading' && state.rows.length > 0;
      if (!state || (state.status === 'loading' && !isReloading)) {
        return h(DataLoading.value ?? DefaultDataLoading, { componentId: component.id });
      }
      if (state.status === 'error') {
        return h(DataError.value ?? DefaultDataError, {
          componentId: component.id,
          error: state.error ?? 'Failed to load data',
          onRetry: () => store.value.retryData(component.id),
        });
      }
      if (state.rows.length === 0) {
        return h(DataEmpty.value ?? DefaultDataEmpty, { componentId: component.id });
      }

      const pageSize = component.pageSize ?? state.pageSize ?? state.rows.length;
      const total = state.total ?? state.rows.length;
      const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

      const onSort = (key: string) => {
        const next =
          state.sort?.key === key && state.sort.direction === 'asc'
            ? { key, direction: 'desc' as const }
            : { key, direction: 'asc' as const };
        store.value.setDataSort(component.id, next);
      };

      const body = renderTableBody(component, state.rows, undefined, state.sort, onSort);

      const pagination =
        pageCount > 1
          ? h('div', { class: 'mdma-table-pagination' }, [
              h(
                'button',
                {
                  type: 'button',
                  disabled: state.page <= 1,
                  onClick: () => store.value.setDataPage(component.id, state.page - 1),
                },
                'Prev',
              ),
              h('span', `Page ${state.page} / ${pageCount}`),
              h(
                'button',
                {
                  type: 'button',
                  disabled: state.page >= pageCount,
                  onClick: () => store.value.setDataPage(component.id, state.page + 1),
                },
                'Next',
              ),
            ])
          : null;

      return h('div', { 'aria-busy': isReloading ? 'true' : undefined }, [
        isReloading
          ? h(DataLoading.value ?? DefaultDataLoading, {
              componentId: component.id,
              reloading: true,
            })
          : null,
        body,
        pagination,
      ]);
    };
  },
});

export const TableRenderer = defineComponent({
  name: 'TableRenderer',
  props: blockRendererProps,
  setup(props) {
    return () => {
      const component = props.component;
      if (component.type !== 'table') return null;

      if (isDataSourceRef(component.data)) {
        return h(DataDrivenTable, { component });
      }

      const rawData =
        typeof component.data === 'string' ? props.resolveBinding(component.data) : component.data;
      const data = Array.isArray(rawData) ? rawData : [];

      return renderTableBody(component, data, props.resolveBinding, undefined, undefined);
    };
  },
});
