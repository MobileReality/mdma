import { describe, expect, it } from 'vitest';
import * as api from '../src/index.js';

describe('public API', () => {
  it('exports the mount entry points', () => {
    for (const name of ['mountMdmaDocument', 'mountMdmaBlock', 'blockRendererProps']) {
      expect(typeof api[name as keyof typeof api], name).toBe('function');
    }
  });

  it('exports every built-in renderer and the registry', () => {
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
      'createRendererRegistry',
      'RendererRegistry',
    ]) {
      expect(api[name as keyof typeof api], name).toBeDefined();
    }
    expect(Object.keys(api.defaultRenderers)).toHaveLength(10);
  });

  it('exports the theme surface shared with the other renderers', () => {
    expect(api.lightTheme.colors.primary).toBe('#6c5ce7');
    expect(api.darkTheme.colors.primary).toBe('#8b7ff0');
    expect(typeof api.resolveThemeProps).toBe('function');
    expect(typeof api.themeToCssVars).toBe('function');
    expect(typeof api.applyTheme).toBe('function');
  });

  it('exports the DOM helpers a host renderer needs', () => {
    for (const name of ['el', 'append', 'clear', 'setInputValue', 'stateless', 'withState']) {
      expect(typeof api[name as keyof typeof api], name).toBe('function');
    }
  });

  it('exports the default form elements so a host can wrap them', () => {
    for (const name of [
      'DefaultInput',
      'DefaultSelect',
      'DefaultCheckbox',
      'DefaultTextarea',
      'DefaultFile',
      'DefaultSubmitButton',
      'DefaultSensitiveIndicator',
    ]) {
      expect(typeof api[name as keyof typeof api], name).toBe('function');
    }
  });

  it('pulls in no framework at runtime', async () => {
    const { dependencies, peerDependencies } = await import('../package.json', {
      with: { type: 'json' },
    }).then((module) => module.default);

    expect(Object.keys(dependencies)).toEqual([
      '@mobile-reality/mdma-runtime',
      '@mobile-reality/mdma-spec',
    ]);
    expect(peerDependencies).toBeUndefined();
  });
});
