import type { RenderContext } from '../../src/context/render-context.js';
import { blockRendererProps, mountMdmaBlock } from '../../src/document/mount-block.js';
import type { MdmaBlockRenderer } from '../../src/renderers/renderer-props.js';
import { firstBlock, parseDoc } from './doc.js';

/**
 * Parse a one-block document and mount `renderer` with exactly the props the
 * document passes it, wired to a live store — so a test can dispatch and assert
 * on what re-renders. `refresh()` re-feeds props the way the document would
 * after a store change.
 */
export async function mountBlockFor(
  markdown: string,
  renderer: MdmaBlockRenderer,
  context: RenderContext = {},
) {
  const { ast, store } = await parseDoc(markdown);
  const block = firstBlock(ast);

  const instance = mountMdmaBlock({
    block,
    store,
    renderers: { [block.component.type]: renderer },
    context,
  });
  document.body.appendChild(instance.el);

  const refresh = () => {
    instance.update(blockRendererProps({ block, store, context }));
    return instance.el;
  };

  return { instance, store, block, component: block.component, refresh };
}

export const html = (element: HTMLElement) => element.outerHTML;
