import type { MdmaBlock as MdmaBlockType, StoreAction } from '@mobile-reality/mdma-spec';
import { memo, useCallback, type ComponentType } from 'react';
import { useDocumentStore, useComponentState } from '../hooks/use-document-store.js';
import { defaultRenderers, type MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

export interface MdmaBlockProps {
  block: MdmaBlockType;
  renderers?: Record<string, ComponentType<MdmaBlockRendererProps>>;
}

export const MdmaBlock = memo(function MdmaBlock({ block, renderers }: MdmaBlockProps) {
  const store = useDocumentStore();
  const componentState = useComponentState(block.component.id);

  // Stable callbacks so memoized child renderers don't re-render unnecessarily
  const dispatch = useCallback((action: StoreAction) => store.dispatch(action), [store]);
  const resolveBinding = useCallback((expr: string) => store.resolveBinding(expr), [store]);

  const Renderer = renderers?.[block.component.type] ?? defaultRenderers[block.component.type];

  if (!Renderer) {
    return (
      <div className="mdma-unknown-component">Unknown component type: {block.component.type}</div>
    );
  }

  return (
    <Renderer
      component={block.component}
      componentState={componentState}
      dispatch={dispatch}
      resolveBinding={resolveBinding}
    />
  );
});
