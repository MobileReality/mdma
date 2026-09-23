import type { TasklistComponent } from '@mobile-reality/mdma-spec';
import { el } from '../dom/el.js';
import type {
  MdmaBlockRenderer,
  MdmaBlockRendererProps,
  RendererInstance,
} from '../renderers/renderer-props.js';

type GetProps = () => MdmaBlockRendererProps;

interface Built {
  el: HTMLElement;
  boxes: Map<string, HTMLInputElement>;
  itemKey: string;
}

const itemKeyOf = (component: TasklistComponent) =>
  component.items.map((item) => item.id).join(' ');

function build(getProps: GetProps, component: TasklistComponent): Built {
  const boxes = new Map<string, HTMLInputElement>();

  const items = component.items.map((item) => {
    const box = el('input', {
      type: 'checkbox',
      on: {
        change: (event: Event) => {
          const checked = (event.target as HTMLInputElement).checked;
          // Read through the getter: this handler outlives the props it was built with.
          const { dispatch, componentState } = getProps();
          const before = componentState?.values ?? {};

          dispatch({
            type: 'FIELD_CHANGED',
            componentId: component.id,
            field: item.id,
            value: checked,
          });

          // Fire onComplete only on the transition into all-items-checked, mirroring
          // how FormRenderer emits ACTION_TRIGGERED on submit.
          if (!component.onComplete) return;
          const wasComplete = component.items.every((other) => Boolean(before[other.id]));
          const isComplete = component.items.every((other) =>
            other.id === item.id ? checked : Boolean(before[other.id]),
          );
          if (!wasComplete && isComplete) {
            dispatch({
              type: 'ACTION_TRIGGERED',
              componentId: component.id,
              actionId: component.onComplete,
            });
          }
        },
      },
    });
    boxes.set(item.id, box);

    return el('li', { class: 'mdma-tasklist-item' }, [
      el('label', {}, [box, el('span', {}, [item.text])]),
    ]);
  });

  const root = el('div', { class: 'mdma-tasklist', dataset: { 'component-id': component.id } }, [
    component.label && el('h3', { class: 'mdma-tasklist-label' }, [component.label]),
    el('ul', { class: 'mdma-tasklist-items' }, items),
  ]);

  return { el: root, boxes, itemKey: itemKeyOf(component) };
}

const emptyBuild = (): Built => ({ el: el('div'), boxes: new Map(), itemKey: '' });

/**
 * Checkboxes are updated in place rather than rebuilt: ticking one dispatches,
 * which re-renders the document, and a rebuilt input would drop focus mid-click.
 */
export const TasklistRenderer: MdmaBlockRenderer = (initial) => {
  let props = initial;
  const getProps: GetProps = () => props;

  let built =
    initial.component.type === 'tasklist' ? build(getProps, initial.component) : emptyBuild();

  const syncChecked = () => {
    const values = props.componentState?.values ?? {};
    for (const [id, box] of built.boxes) box.checked = Boolean(values[id]);
  };
  syncChecked();

  const instance: RendererInstance = {
    el: built.el,
    update(next) {
      props = next;
      if (next.component.type !== 'tasklist') return;

      // Only a changed item set forces a rebuild; a value change applies in place.
      if (itemKeyOf(next.component) !== built.itemKey) {
        const rebuilt = build(getProps, next.component);
        built.el.replaceWith(rebuilt.el);
        built = rebuilt;
        instance.el = rebuilt.el;
      }
      syncChecked();
    },
  };

  return instance;
};
