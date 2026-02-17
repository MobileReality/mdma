import { memo } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

export const TasklistRenderer = memo(function TasklistRenderer({ component, componentState, dispatch }: MdmaBlockRendererProps) {
  if (component.type !== 'tasklist') return null;

  return (
    <div className="mdma-tasklist" data-component-id={component.id}>
      {component.label && <h3 className="mdma-tasklist-label">{component.label}</h3>}
      <ul className="mdma-tasklist-items">
        {component.items.map((item) => (
          <li key={item.id} className="mdma-tasklist-item">
            <label>
              <input
                type="checkbox"
                checked={Boolean(componentState?.values[item.id])}
                onChange={(e) =>
                  dispatch({
                    type: 'FIELD_CHANGED',
                    componentId: component.id,
                    field: item.id,
                    value: e.target.checked,
                  })
                }
              />
              <span>{item.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
});
