import type { ComponentState } from '@mobile-reality/mdma-runtime';
import type { MdmaComponent, StoreAction } from '@mobile-reality/mdma-spec';
import type { RenderContext } from '../context/render-context.js';

/** What every block renderer receives. Mirrors the React and Vue renderers' props. */
export interface MdmaBlockRendererProps {
  component: MdmaComponent;
  componentState: ComponentState | undefined;
  dispatch: (action: StoreAction) => void;
  resolveBinding: (expr: string) => unknown;
  /** Host customizations — data sources, element overrides, custom variants. */
  context: RenderContext;
}

/**
 * A mounted renderer. There is no virtual DOM here: a renderer owns its element
 * and is handed new props whenever the store or the AST changes, so it can
 * decide what to touch. That is what keeps a focused input intact while a
 * streamed document re-parses on every chunk.
 */
export interface RendererInstance {
  /** The element currently in the document. Re-read after `update` — it may be replaced. */
  el: HTMLElement;
  update(props: MdmaBlockRendererProps): void;
  destroy?(): void;
}

export type MdmaBlockRenderer = (props: MdmaBlockRendererProps) => RendererInstance;

/**
 * Build a renderer from a plain render function, for components with nothing
 * worth preserving between renders — no focusable control whose value the user
 * is editing. Each update rebuilds the element and swaps it in place.
 *
 * A component that owns editable state (`form`, `tasklist`) implements
 * {@link RendererInstance} directly and updates in place instead.
 */
export function stateless(
  render: (props: MdmaBlockRendererProps) => HTMLElement,
): MdmaBlockRenderer {
  return withState<undefined>(
    () => undefined,
    (props) => render(props),
  );
}

/**
 * Like {@link stateless}, but with view state that outlives a rebuild — a
 * revealed PII cell, a fired webhook. This is presentation state only; anything
 * the document should remember belongs in the store.
 */
export function withState<TState>(
  createState: () => TState,
  render: (props: MdmaBlockRendererProps, state: TState) => HTMLElement,
): MdmaBlockRenderer {
  return (initial) => {
    const state = createState();
    const instance: RendererInstance = {
      el: render(initial, state),
      update(next) {
        const replacement = render(next, state);
        instance.el.replaceWith(replacement);
        instance.el = replacement;
      },
    };
    return instance;
  };
}
