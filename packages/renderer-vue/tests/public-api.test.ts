import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as api from '../src/index.js';

/**
 * Value exports the React renderer ships, read from its `index.ts` rather than
 * imported — the React package can't be loaded in this environment, and the
 * point is the surface, not the implementation.
 */
function reactValueExports(): string[] {
  // Resolved from the package root (vitest's cwd) rather than `import.meta.url`,
  // which vite rewrites for modules inside the transformed graph.
  const source = readFileSync(resolve('../renderer-react/src/index.ts'), 'utf8');
  return [...source.matchAll(/export\s*\{([^}]*)\}/g)]
    .flatMap((match) => match[1].split(','))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && !entry.startsWith('type '))
    .map((entry) => entry.split(/\s+as\s+/).pop() as string);
}

describe('public API', () => {
  it('exports every value the React renderer exports', () => {
    const expected = reactValueExports();
    // Guard against the extraction silently matching nothing, which would make
    // the comparison below pass for the wrong reason.
    expect(expected).toContain('MdmaDocument');
    expect(expected.length).toBeGreaterThan(20);

    const missing = expected.filter((name) => !(name in api));
    expect(missing, `missing exports: ${missing.join(', ')}`).toEqual([]);
  });

  it('exports a renderer for each of the ten component types', () => {
    for (const name of [
      'FormRenderer',
      'ButtonRenderer',
      'TasklistRenderer',
      'TableRenderer',
      'CalloutRenderer',
      'ApprovalGateRenderer',
      'WebhookRenderer',
      'ChartRenderer',
      'ThinkingRenderer',
      'CustomRenderer',
    ]) {
      expect(api[name as keyof typeof api], `missing ${name}`).toBeDefined();
    }
  });

  it('exports the Vue-specific prop declaration renderers need', () => {
    // No React counterpart: Vue needs a runtime prop declaration, not just a type.
    expect(api.blockRendererProps).toBeDefined();
    expect(Object.keys(api.blockRendererProps)).toEqual([
      'component',
      'componentState',
      'dispatch',
      'resolveBinding',
    ]);
  });
});
