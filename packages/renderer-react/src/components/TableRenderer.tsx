import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

export function TableRenderer({ component, resolveBinding }: MdmaBlockRendererProps) {
  if (component.type !== 'table') return null;

  const rawData = typeof component.data === 'string' ? resolveBinding(component.data) : component.data;
  const data = Array.isArray(rawData) ? rawData : [];

  return (
    <div className="mdma-table" data-component-id={component.id}>
      {component.label && <h3 className="mdma-table-label">{component.label}</h3>}
      <table>
        <thead>
          <tr>
            {component.columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {component.columns.map((col) => (
                <td key={col.key}>{String((row as Record<string, unknown>)[col.key] ?? '')}</td>
              ))}
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
