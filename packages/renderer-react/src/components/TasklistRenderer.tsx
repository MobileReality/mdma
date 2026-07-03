import { memo } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

export const TasklistRenderer = memo(function TasklistRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
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
                onChange={(e) => {
                  const checked = e.target.checked;
                  dispatch({
                    type: 'FIELD_CHANGED',
                    componentId: component.id,
                    field: item.id,
                    value: checked,
                  });
                  // Fire onComplete only on the transition into all-items-checked, mirroring
                  // how FormRenderer emits ACTION_TRIGGERED on submit.
                  if (component.onComplete) {
                    const wasComplete = component.items.every((it) =>
                      Boolean(componentState?.values[it.id]),
                    );
                    const isComplete = component.items.every((it) =>
                      it.id === item.id ? checked : Boolean(componentState?.values[it.id]),
                    );
                    if (!wasComplete && isComplete) {
                      dispatch({
                        type: 'ACTION_TRIGGERED',
                        componentId: component.id,
                        actionId: component.onComplete,
                      });
                    }
                  }
                }}
              />
              <span>{item.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
});
