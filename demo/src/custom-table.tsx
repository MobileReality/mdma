import {
  DefaultDataEmpty,
  DefaultDataError,
  DefaultDataLoading,
  type MdmaBlockRendererProps,
  useDataState,
  useDocumentStore,
  useElementOverride,
} from '@mobile-reality/mdma-renderer-react';
import { type TableComponent, isDataSourceRef } from '@mobile-reality/mdma-spec';
import { type KeyboardEvent, type ReactNode, memo, useState } from 'react';

type TableColumn = TableComponent['columns'][number];
type SortState = { key: string; direction: 'asc' | 'desc' };

function SensitiveCell({ value, scope }: { value: string; scope?: unknown }) {
  const [state, setState] = useState({ scope, revealed: false });
  const revealed = state.scope === scope && state.revealed;
  return (
    <span
      className="custom-table-cell--sensitive"
      onClick={() => setState({ scope, revealed: !revealed })}
      title={revealed ? 'Click to mask' : 'Click to reveal'}
    >
      {revealed ? value : '•••••'}
    </span>
  );
}

function nextSort(current: SortState | undefined, key: string): SortState {
  return current?.key === key && current.direction === 'asc'
    ? { key, direction: 'desc' }
    : { key, direction: 'asc' };
}

function ariaSort(sort: SortState | undefined, key: string) {
  if (sort?.key !== key) return undefined;
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

function sortHandlers(onSort: ((key: string) => void) | undefined, col: TableColumn) {
  if (!onSort || !col.sortable) return {};
  return {
    className: 'custom-table-sortable',
    tabIndex: 0,
    onClick: () => onSort(col.key),
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSort(col.key);
      }
    },
  };
}

function CustomTableFrame({
  component,
  busy,
  toolbar,
  footer,
  children,
}: {
  component: TableComponent;
  busy?: boolean;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="custom-table" data-component-id={component.id} aria-busy={busy || undefined}>
      {component.label && <h3 className="custom-table-label">{component.label}</h3>}
      {toolbar}
      {children}
      {footer}
    </div>
  );
}

function CustomTableGrid({
  component,
  rows,
  resolveBinding,
  revealScope,
  sort,
  onSort,
}: {
  component: TableComponent;
  rows: unknown[];
  resolveBinding?: (expr: string) => unknown;
  revealScope?: unknown;
  sort?: SortState;
  onSort?: (key: string) => void;
}) {
  const sensitiveKeys = new Set(
    component.columns.filter((col) => col.sensitive).map((col) => col.key),
  );

  return (
    <div className="custom-table-scroll">
      <table>
        <thead>
          <tr>
            {component.columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                aria-sort={ariaSort(sort, col.key)}
                {...sortHandlers(onSort, col)}
              >
                {col.header}
                {sort?.key === col.key && (
                  <span className="custom-table-sort-indicator" aria-hidden="true">
                    {sort.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                {col.sensitive && (
                  <span className="mdma-sensitive-badge" title="Sensitive (PII)">
                    &#128274;
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {component.columns.map((col) => {
                const raw = (row as Record<string, unknown>)[col.key] ?? '';
                const resolved =
                  resolveBinding && typeof raw === 'string' && /^\{\{.+\}\}$/.test(raw)
                    ? resolveBinding(raw)
                    : raw;
                const cellValue = String(resolved ?? '');
                return (
                  <td key={col.key}>
                    {sensitiveKeys.has(col.key) && cellValue ? (
                      <SensitiveCell value={cellValue} scope={revealScope} />
                    ) : (
                      cellValue
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={component.columns.length} className="custom-table-empty">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CustomTableFilter({
  componentId,
  defaultValue,
}: {
  componentId: string;
  defaultValue?: string;
}) {
  const store = useDocumentStore();
  return (
    <div className="custom-table-filter">
      <input
        type="search"
        aria-label="Filter rows"
        placeholder="Filter..."
        defaultValue={defaultValue ?? ''}
        onChange={(event) => store.setDataFilter(componentId, event.target.value || undefined)}
      />
    </div>
  );
}

function CustomTablePagination({
  componentId,
  page,
  pageCount,
}: {
  componentId: string;
  page: number;
  pageCount: number;
}) {
  const store = useDocumentStore();
  if (pageCount <= 1) return null;
  return (
    <div className="custom-table-pagination">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => store.setDataPage(componentId, page - 1)}
      >
        Prev
      </button>
      <span className="custom-table-pagination-status">
        Page {page} / {pageCount}
      </span>
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => store.setDataPage(componentId, page + 1)}
      >
        Next
      </button>
    </div>
  );
}

function SourceBackedTable({ component }: { component: TableComponent }) {
  const store = useDocumentStore();
  const dataState = useDataState(component.id);
  const DataLoading = useElementOverride('table', 'dataLoading') ?? DefaultDataLoading;
  const DataError = useElementOverride('table', 'dataError') ?? DefaultDataError;
  const DataEmpty = useElementOverride('table', 'dataEmpty') ?? DefaultDataEmpty;

  if (!dataState) {
    return (
      <CustomTableFrame component={component}>
        <DataLoading componentId={component.id} />
      </CustomTableFrame>
    );
  }

  const isReloading = dataState.status === 'loading' && dataState.rows.length > 0;
  const toolbar = component.filterable ? (
    <CustomTableFilter componentId={component.id} defaultValue={dataState.filter} />
  ) : null;

  if (dataState.status === 'loading' && !isReloading) {
    return (
      <CustomTableFrame component={component} toolbar={toolbar}>
        <DataLoading componentId={component.id} />
      </CustomTableFrame>
    );
  }
  if (dataState.status === 'error') {
    return (
      <CustomTableFrame component={component} toolbar={toolbar}>
        <DataError
          componentId={component.id}
          error={dataState.error ?? 'Failed to load data'}
          onRetry={() => store.retryData(component.id)}
        />
      </CustomTableFrame>
    );
  }
  if (dataState.rows.length === 0) {
    return (
      <CustomTableFrame component={component} toolbar={toolbar}>
        <DataEmpty componentId={component.id} />
      </CustomTableFrame>
    );
  }

  const pageSize = component.pageSize ?? dataState.pageSize ?? dataState.rows.length;
  const total = dataState.total ?? dataState.rows.length;
  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <CustomTableFrame
      component={component}
      busy={isReloading}
      toolbar={toolbar}
      footer={
        <CustomTablePagination
          componentId={component.id}
          page={dataState.page}
          pageCount={pageCount}
        />
      }
    >
      {isReloading && <DataLoading componentId={component.id} reloading />}
      <CustomTableGrid
        component={component}
        rows={dataState.rows}
        revealScope={dataState.rows}
        sort={dataState.sort}
        onSort={(key) => store.setDataSort(component.id, nextSort(dataState.sort, key))}
      />
    </CustomTableFrame>
  );
}

export const CustomTableRenderer = memo(function CustomTableRenderer({
  component,
  resolveBinding,
}: MdmaBlockRendererProps) {
  if (component.type !== 'table') return null;

  if (isDataSourceRef(component.data)) return <SourceBackedTable component={component} />;

  const rawData =
    typeof component.data === 'string' ? resolveBinding(component.data) : component.data;
  const rows = Array.isArray(rawData) ? rawData : [];

  return (
    <CustomTableFrame component={component}>
      <CustomTableGrid component={component} rows={rows} resolveBinding={resolveBinding} />
    </CustomTableFrame>
  );
});
