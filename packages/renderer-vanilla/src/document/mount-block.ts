import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaBlock } from '@mobile-reality/mdma-spec';
import type { RenderContext } from '../context/render-context.js';
import { el } from '../dom/el.js';
import type {
  MdmaBlockRenderer,
  MdmaBlockRendererProps,
  RendererInstance,
} from '../renderers/renderer-props.js';
import { defaultRenderers } from '../renderers/renderer-registry.js';

export interface MountBlockOptions {
  block: MdmaBlock;
  store: DocumentStore;
  /** Host renderer overrides, tried before the built-ins. */
  renderers?: Record<string, MdmaBlockRenderer>;
  context?: RenderContext;
}

export function blockRendererProps(options: MountBlockOptions): MdmaBlockRendererProps {
  const { block, store } = options;
  return {
    component: block.component,
    componentState: store.getComponentState(block.component.id),
    dispatch: (action) => store.dispatch(action),
    resolveBinding: (expr) => store.resolveBinding(expr),
    context: options.context ?? {},
  };
}

const unknownType = (type: string) =>
  el('div', { class: 'mdma-unknown-component' }, [`Unknown component type: ${type}`]);

/**
 * Mount one parsed MDMA block: look up the renderer for its component type
 * (host-supplied first, then the built-ins) and hand it the component, its
 * state, and the store callbacks.
 */
export function mountMdmaBlock(options: MountBlockOptions): RendererInstance {
  const type = options.block.component.type;
  const renderer = options.renderers?.[type] ?? defaultRenderers[type];

  if (!renderer) {
    const instance: RendererInstance = {
      el: unknownType(type),
      update() {},
    };
    return instance;
  }

  return renderer(blockRendererProps(options));
}
