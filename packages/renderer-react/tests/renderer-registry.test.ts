import { describe, it, expect } from 'vitest';
import { RendererRegistry } from '../src/renderers/renderer-registry.js';

describe('RendererRegistry', () => {
  it('registers and retrieves renderers', () => {
    const registry = new RendererRegistry();
    const MockRenderer = () => null;

    registry.register('form', MockRenderer);
    expect(registry.has('form')).toBe(true);
    expect(registry.get('form')).toBe(MockRenderer);
  });

  it('returns undefined for unregistered types', () => {
    const registry = new RendererRegistry();
    expect(registry.has('unknown')).toBe(false);
    expect(registry.get('unknown')).toBeUndefined();
  });
});
