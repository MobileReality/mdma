import { memo, useState } from 'react';
import { isDataSourceRef, type TableComponent, type TableColumn } from '@mobile-reality/mdma-spec';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useDataState, useDocumentStore } from '../hooks/use-document-store.js';
import { useElementOverride } from '../context/ElementOverridesContext.js';
import { DefaultDataLoading, DefaultDataError, DefaultDataEmpty } from './DataStateViews.js';

function MaskedCell({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      className="mdma-table-cell--sensitive"
      onClick={() => setRevealed(!revealed)}
      title={revealed ? 'Click to mask' : 'Click to reveal'}
    >
      {revealed ? value : '•••••'}
    </span>
  );
}

export const TableRenderer = memo(function TableRenderer({
  component,
  resolveBinding,
}: MdmaBlockRendererProps) {
  if (component.type !== 'table') return null;

  if (isDataSourceRef(component.data)) {
    return <DataDrivenTable component={component} />;
  }

  const rawData =
    typeof component.data === 'string' ? resolveBinding(component.data) : component.data;
  const data = Array.isArray(rawData) ? rawData : [];

  return <TableBody component={component} data={data} resolveBinding={resolveBinding} />;
});

function DataDrivenTable({ component }: { component: TableComponent }) {
  const store = useDocumentStore();
  const dataState = useDataState(component.id);
  const DataLoading = useElementOverride('table', 'dataLoading') ?? DefaultDataLoading;
  const DataError = useElementOverride('table', 'dataError') ?? DefaultDataError;
  const DataEmpty = useElementOverride('table', 'dataEmpty') ?? DefaultDataEmpty;

  if (!dataState || dataState.status === 'loading') {
    return <DataLoading componentId={component.id} />;
  }
  if (dataState.status === 'error') {
    return (
      <DataError
        componentId={component.id}
        error={dataState.error ?? 'Failed to load data'}
        onRetry={() => store.retryData(component.id)}
      />
    );
  }
  if (dataState.rows.length === 0) {
    return <DataEmpty componentId={component.id} />;
  }

  const pageSize = component.pageSize ?? dataState.pageSize ?? dataState.rows.length;
  const total = dataState.total ?? dataState.rows.length;
  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <div>
      <TableBody
        component={component}
        data={dataState.rows}
        sort={dataState.sort}
        onSort={(key) => {
          const next =
            dataState.sort?.key === key && dataState.sort.direction === 'asc'
              ? { key, direction: 'desc' as const }
              : { key, direction: 'asc' as const };
          store.setDataSort(component.id, next);
        }}
      />
      {pageCount > 1 && (
        <div className="mdma-table-pagination">
          <button
            type="button"
            disabled={dataState.page <= 1}
            onClick={() => store.setDataPage(component.id, dataState.page - 1)}
          >
            Prev
          </button>
          <span>
            Page {dataState.page} / {pageCount}
          </span>
          <button
            type="button"
            disabled={dataState.page >= pageCount}
            onClick={() => store.setDataPage(component.id, dataState.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function TableBody({
  component,
  data,
  sort,
  onSort,
  resolveBinding,
}: {
  component: TableComponent;
  data: unknown[];
  sort?: { key: string; direction: 'asc' | 'desc' };
  onSort?: (key: string) => void;
  resolveBinding?: (expr: string) => unknown;
}) {
  const sensitiveKeys = new Set(
    component.columns.filter((col) => col.sensitive).map((col) => col.key),
  );

  return (
    <div className="mdma-table" data-component-id={component.id}>
      {component.label && <h3 className="mdma-table-label">{component.label}</h3>}
      <table>
        <thead>
          <tr>
            {component.columns.map((col: TableColumn) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                onClick={onSort && col.sortable ? () => onSort(col.key) : undefined}
                className={onSort && col.sortable ? 'mdma-table-sortable' : undefined}
              >
                {col.header}
                {sort?.key === col.key && (sort.direction === 'asc' ? ' ↑' : ' ↓')}
                {col.sensitive && (
                  <span className="mdma-sensitive-badge" title="Sensitive column (PII)">
                    &#128274;
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {component.columns.map((col: TableColumn) => {
                const raw = (row as Record<string, unknown>)[col.key] ?? '';
                const resolved =
                  resolveBinding && typeof raw === 'string' && /^\{\{.+\}\}$/.test(raw)
                    ? resolveBinding(raw)
                    : raw;
                const cellValue = String(resolved ?? '');
                return (
                  <td key={col.key}>
                    {sensitiveKeys.has(col.key) && cellValue ? (
                      <MaskedCell value={cellValue} />
                    ) : (
                      cellValue
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={component.columns.length} className="mdma-table-empty">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
