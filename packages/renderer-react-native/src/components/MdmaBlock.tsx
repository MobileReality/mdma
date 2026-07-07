import type { MdmaBlock as MdmaBlockType, StoreAction } from '@mobile-reality/mdma-spec';
import { memo, useCallback, type ComponentType } from 'react';
import { Text, View } from 'react-native';
import { useDocumentStore, useComponentState } from '../hooks/use-document-store.js';
import { defaultRenderers, type MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';

export interface MdmaBlockProps {
  block: MdmaBlockType;
  renderers?: Record<string, ComponentType<MdmaBlockRendererProps>>;
}

export const MdmaBlock = memo(function MdmaBlock({ block, renderers }: MdmaBlockProps) {
  const store = useDocumentStore();
  const theme = useMdmaTheme();
  const componentState = useComponentState(block.component.id);

  // Stable callbacks so memoized child renderers don't re-render unnecessarily
  const dispatch = useCallback((action: StoreAction) => store.dispatch(action), [store]);
  const resolveBinding = useCallback((expr: string) => store.resolveBinding(expr), [store]);

  const Renderer = renderers?.[block.component.type] ?? defaultRenderers[block.component.type];

  if (!Renderer) {
    return (
      <View style={{ padding: theme.spacing.sm }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.small }}>
          Unknown component type: {block.component.type}
        </Text>
      </View>
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
