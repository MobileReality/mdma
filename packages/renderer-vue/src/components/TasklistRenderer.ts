import { defineComponent, h } from 'vue';
import { blockRendererProps } from '../renderers/renderer-registry.js';

export const TasklistRenderer = defineComponent({
  name: 'TasklistRenderer',
  props: blockRendererProps,
  setup(props) {
    return () => {
      const component = props.component;
      if (component.type !== 'tasklist') return null;

      const values = props.componentState?.values ?? {};

      return h('div', { class: 'mdma-tasklist', 'data-component-id': component.id }, [
        component.label ? h('h3', { class: 'mdma-tasklist-label' }, component.label) : null,
        h(
          'ul',
          { class: 'mdma-tasklist-items' },
          component.items.map((item) =>
            h('li', { key: item.id, class: 'mdma-tasklist-item' }, [
              h('label', [
                h('input', {
                  type: 'checkbox',
                  checked: Boolean(values[item.id]),
                  onChange: (e: Event) => {
                    const checked = (e.target as HTMLInputElement).checked;
                    props.dispatch({
                      type: 'FIELD_CHANGED',
                      componentId: component.id,
                      field: item.id,
                      value: checked,
                    });
                    // Fire onComplete only on the transition into all-items-checked, mirroring
                    // how FormRenderer emits ACTION_TRIGGERED on submit.
                    if (component.onComplete) {
                      const wasComplete = component.items.every((it) => Boolean(values[it.id]));
                      const isComplete = component.items.every((it) =>
                        it.id === item.id ? checked : Boolean(values[it.id]),
                      );
                      if (!wasComplete && isComplete) {
                        props.dispatch({
                          type: 'ACTION_TRIGGERED',
                          componentId: component.id,
                          actionId: component.onComplete,
                        });
                      }
                    }
                  },
                }),
                h('span', item.text),
              ]),
            ]),
          ),
        ),
      ]);
    };
  },
});
