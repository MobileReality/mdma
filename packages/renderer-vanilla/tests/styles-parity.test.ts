import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// This renderer emits the same `.mdma-*` class names as the React and Vue ones,
// so a theme is portable across all three. Keeping the stylesheets byte-identical
// is what makes that true — this guard fails the moment one is edited alone.
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

describe('styles.css', () => {
  it('is identical to the React renderer stylesheet', () => {
    expect(read('../styles.css')).toBe(read('../../renderer-react/styles.css'));
  });

  it('defines the theme token variables the renderers read', () => {
    const css = read('../styles.css');
    for (const token of [
      '--mdma-color-primary',
      '--mdma-color-on-primary',
      '--mdma-color-text-muted',
      '--mdma-color-info-bg',
      '--mdma-spacing-lg',
      '--mdma-radius-md',
      '--mdma-font-size-title',
    ]) {
      expect(css, `missing ${token}`).toContain(token);
    }
  });
});
