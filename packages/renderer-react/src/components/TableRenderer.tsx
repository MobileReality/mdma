import { memo, useState } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

function MaskedCell({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      className="mdma-table-cell--sensitive"
      onClick={() => setRevealed(!revealed)}
      title={revealed ? 'Click to mask' : 'Click to reveal'}
    >
      {revealed ? value : '\u2022\u2022\u2022\u2022\u2022'}
    </span>
  );
}

export const TableRenderer = memo(function TableRenderer({ component, resolveBinding }: MdmaBlockRendererProps) {
  if (component.type !== 'table') return null;

  const rawData = typeof component.data === 'string' ? resolveBinding(component.data) : component.data;
  const data = Array.isArray(rawData) ? rawData : [];

  const sensitiveKeys = new Set(
    component.columns.filter((col) => col.sensitive).map((col) => col.key),
  );

  return (
    <div className="mdma-table" data-component-id={component.id}>
      {component.label && <h3 className="mdma-table-label">{component.label}</h3>}
      <table>
        <thead>
          <tr>
            {component.columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.header}
                {col.sensitive && (
                  <span className="mdma-sensitive-badge" title="Sensitive column (PII)">&#128274;</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {component.columns.map((col) => {
                const raw = (row as Record<string, unknown>)[col.key] ?? '';
                const resolved = typeof raw === 'string' && /^\{\{.+\}\}$/.test(raw)
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
});
