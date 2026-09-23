import { describe, expect, it } from 'vitest';
import { CustomRenderer } from '../src/components/CustomRenderer.js';
import type { CustomVariantProps, CustomVariantRenderer } from '../src/context/render-context.js';
import { el } from '../src/dom/el.js';
import { mdma } from './helpers/doc.js';
import { mountBlockFor } from './helpers/mount.js';

const CUSTOM = mdma('type: custom\nid: viz\nname: graph-3d\nprops:\n  title: "Sales"');

describe('CustomRenderer', () => {
  it('names an unregistered variant instead of crashing', async () => {
    const { instance } = await mountBlockFor(CUSTOM, CustomRenderer);
    expect(instance.el.className).toBe('mdma-unknown-component');
    expect(instance.el.textContent).toBe('Unknown custom component: graph-3d');
  });

  it('hands the variant its props payload', async () => {
    let seen: CustomVariantProps | undefined;
    const Graph3D: CustomVariantRenderer = (initial) => {
      seen = initial;
      return { el: el('div', { class: 'graph' }), update() {} };
    };

    const { instance } = await mountBlockFor(CUSTOM, CustomRenderer, {
      customVariants: { 'graph-3d': Graph3D },
    });

    expect(instance.el.className).toBe('graph');
    expect(seen?.props).toEqual({ title: 'Sales' });
    expect(seen?.component.name).toBe('graph-3d');
  });

  it('re-feeds a live variant rather than remounting it', async () => {
    let updates = 0;
    const Graph3D: CustomVariantRenderer = () => ({
      el: el('canvas', { class: 'graph' }),
      update() {
        updates += 1;
      },
    });

    const { instance, refresh } = await mountBlockFor(CUSTOM, CustomRenderer, {
      customVariants: { 'graph-3d': Graph3D },
    });
    const before = instance.el;

    refresh();

    expect(instance.el).toBe(before);
    expect(updates).toBe(1);
  });

  it('lets the variant dispatch into the store', async () => {
    const Clicker: CustomVariantRenderer = (props) => {
      const node = el('button', {
        class: 'pick',
        on: {
          click: () =>
            props.dispatch({
              type: 'FIELD_CHANGED',
              componentId: props.component.id,
              field: 'picked',
              value: 'Q3',
            }),
        },
      });
      return { el: node, update() {} };
    };

    const { instance, store } = await mountBlockFor(CUSTOM, CustomRenderer, {
      customVariants: { 'graph-3d': Clicker },
    });

    instance.el.querySelector<HTMLButtonElement>('.pick')?.click();
    (instance.el as HTMLButtonElement).click();

    expect(store.getComponentState('viz')?.values.picked).toBe('Q3');
  });
});
