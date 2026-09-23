import { describe, expect, it } from 'vitest';
import { el } from '../src/dom/el.js';
import type { MdmaBlockRenderer } from '../src/renderers/renderer-props.js';
import {
  RendererRegistry,
  createRendererRegistry,
  defaultRenderers,
} from '../src/renderers/renderer-registry.js';

const Stub: MdmaBlockRenderer = () => ({ el: el('div'), update() {} });

describe('renderer registry', () => {
  it('ships a renderer for every core component type', () => {
    expect(Object.keys(defaultRenderers).sort()).toEqual([
      'approval-gate',
      'button',
      'callout',
      'chart',
      'custom',
      'form',
      'table',
      'tasklist',
      'thinking',
      'webhook',
    ]);
  });

  it('starts empty and registers by type', () => {
    const registry = new RendererRegistry();
    expect(registry.has('form')).toBe(false);

    registry.register('form', Stub);
    expect(registry.get('form')).toBe(Stub);
    expect(registry.toRecord()).toEqual({ form: Stub });
  });

  it('pre-populates the built-ins and lets them be overridden', () => {
    const registry = createRendererRegistry();
    expect(registry.get('form')).toBe(defaultRenderers.form);

    registry.register('form', Stub);
    expect(registry.get('form')).toBe(Stub);
    // Overriding the registry must not mutate the shared defaults.
    expect(defaultRenderers.form).not.toBe(Stub);
  });
});
