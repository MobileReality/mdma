import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { COMPONENT_TYPES } from '@mobile-reality/mdma-spec';
import {
  RendererRegistry,
  createRendererRegistry,
  defaultRenderers,
} from '../src/renderers/renderer-registry.js';

const MockRenderer = defineComponent({ setup: () => () => h('i') });

describe('RendererRegistry', () => {
  it('registers and retrieves renderers', () => {
    const registry = new RendererRegistry();

    registry.register('form', MockRenderer);
    expect(registry.has('form')).toBe(true);
    expect(registry.get('form')).toBe(MockRenderer);
  });

  it('returns undefined for unregistered types', () => {
    const registry = new RendererRegistry();
    expect(registry.has('unknown')).toBe(false);
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('converts to a plain record for use as the renderers prop', () => {
    const registry = new RendererRegistry();
    registry.register('form', MockRenderer);
    expect(registry.toRecord()).toEqual({ form: MockRenderer });
  });

  it('lets a later registration override an earlier one', () => {
    const registry = new RendererRegistry();
    const Replacement = defineComponent({ setup: () => () => h('b') });
    registry.register('form', MockRenderer);
    registry.register('form', Replacement);
    expect(registry.get('form')).toBe(Replacement);
  });
});

describe('defaultRenderers', () => {
  it('ships a default renderer for every core component type', () => {
    for (const type of COMPONENT_TYPES) {
      expect(defaultRenderers[type], `missing default renderer for "${type}"`).toBeDefined();
    }
  });

  it('registers the custom-component dispatcher', () => {
    expect(defaultRenderers.custom).toBeDefined();
  });

  it('createRendererRegistry pre-populates every default', () => {
    const registry = createRendererRegistry();
    for (const type of COMPONENT_TYPES) {
      expect(registry.has(type), `registry missing "${type}"`).toBe(true);
    }
  });

  it('lets a caller override a built-in renderer', () => {
    const registry = createRendererRegistry();
    registry.register('form', MockRenderer);
    expect(registry.get('form')).toBe(MockRenderer);
    expect(registry.get('button')).toBe(defaultRenderers.button);
  });
});
