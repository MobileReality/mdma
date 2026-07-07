import type { MdmaRoot, MdmaBlock as MdmaBlockType } from '@mobile-reality/mdma-spec';
import { MDMA_LANG_TAG } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { useRef, useMemo, type ComponentType } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { MdmaProvider } from '../context/MdmaProvider.js';
import { MdmaThemeProvider, type MdmaThemeProviderProps } from '../theme/MdmaThemeProvider.js';
import { MdmaBlock } from './MdmaBlock.js';
import { MdmaBlockLoading } from './MdmaBlockLoading.js';
import { MdastRenderer } from './MdastRenderer.js';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

/**
 * A component entry is either a full renderer `ComponentType`, or a config
 * object carrying a `renderer`. (Element-level sub-overrides — the web
 * renderer's `elements` slot — are not part of the RN v1 surface yet; an
 * `elements` field is accepted and ignored for forward compatibility.)
 */
export type ComponentEntry =
  | ComponentType<MdmaBlockRendererProps>
  | { renderer?: ComponentType<MdmaBlockRendererProps>; elements?: Record<string, unknown> };

/** Rendering customizations — a single map keyed by component type. */
export interface MdmaRenderCustomizations {
  /** Component-level renderer overrides keyed by MDMA component type name. */
  components?: Record<string, ComponentEntry>;
  /** Named option lists that form select fields can reference by string. */
  dataSources?: Record<string, Array<{ label: string; value: string }>>;
}

export interface MdmaDocumentProps {
  ast: MdmaRoot;
  store: DocumentStore;
  /** Rendering customizations (component renderer overrides + data sources). */
  customizations?: MdmaRenderCustomizations;
  /** Theme passed through to `MdmaThemeProvider` (`'light'` | `'dark'` | a full theme). */
  theme?: MdmaThemeProviderProps['theme'];
  style?: StyleProp<ViewStyle>;
}

function isComponentConfig(
  entry: ComponentEntry,
): entry is { renderer?: ComponentType<MdmaBlockRendererProps>; elements?: Record<string, unknown> } {
  return typeof entry === 'object' && entry !== null && ('renderer' in entry || 'elements' in entry);
}

/** Reduce the unified `components` map to a plain renderer record. */
function toRenderers(
  components?: Record<string, ComponentEntry>,
): Record<string, ComponentType<MdmaBlockRendererProps>> | undefined {
  if (!components) return undefined;
  const renderers: Record<string, ComponentType<MdmaBlockRendererProps>> = {};
  for (const [key, entry] of Object.entries(components)) {
    if (isComponentConfig(entry)) {
      if (entry.renderer) renderers[key] = entry.renderer;
    } else {
      renderers[key] = entry as ComponentType<MdmaBlockRendererProps>;
    }
  }
  return Object.keys(renderers).length > 0 ? renderers : undefined;
}

/** Extract the `id` field from partial YAML content. */
function extractIdFromYaml(yaml?: string): string | null {
  if (!yaml) return null;
  const match = yaml.match(/^\s*id:\s*(\S+)/m);
  return match ? match[1] : null;
}

/** Extract the `type` field from partial YAML content. */
function extractTypeFromYaml(yaml?: string): string | null {
  if (!yaml) return null;
  const match = yaml.match(/^\s*type:\s*(\S+)/m);
  return match ? match[1] : null;
}

/**
 * Build a synthetic MdmaBlock for a thinking component from partial YAML so the
 * block streams its content live instead of showing a loading skeleton.
 */
function buildPartialThinkingBlock(yaml: string): MdmaBlockType | null {
  const id = extractIdFromYaml(yaml);
  if (!id) return null;

  const labelMatch = yaml.match(/^\s*label:\s*(.+)$/m);
  const label = labelMatch ? labelMatch[1].trim() : undefined;

  let content = '';
  const contentBlockMatch = yaml.match(/^\s*content:\s*\|\s*\n([\s\S]*)$/m);
  if (contentBlockMatch) {
    const rawBlock = contentBlockMatch[1];
    const lines: string[] = [];
    for (const line of rawBlock.split('\n')) {
      if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t')) break;
      lines.push(line.replace(/^ {1,2}/, ''));
    }
    content = lines.join('\n').trimEnd();
  } else {
    const inlineMatch = yaml.match(/^\s*content:\s*(?:"([^"]*)"|'([^']*)'|(.+))$/m);
    if (inlineMatch) {
      content = (inlineMatch[1] ?? inlineMatch[2] ?? inlineMatch[3] ?? '').trim();
    }
  }

  return {
    type: 'mdmaBlock',
    rawYaml: yaml,
    component: {
      type: 'thinking',
      id,
      content: content || '...',
      status: 'thinking',
      collapsed: false,
      ...(label ? { label } : {}),
    },
  } as MdmaBlockType;
}

export function MdmaDocument({ ast, store, customizations, theme, style }: MdmaDocumentProps) {
  const renderers = useMemo(
    () => toRenderers(customizations?.components),
    [customizations?.components],
  );

  // Cache of successfully parsed blocks by component ID. Prevents flickering
  // during streaming when a block alternates between parsed and pending states.
  const renderedBlocksRef = useRef<Map<string, MdmaBlockType>>(new Map());

  return (
    <MdmaThemeProvider theme={theme}>
      <MdmaProvider store={store} dataSources={customizations?.dataSources}>
        <View style={style}>
          {ast.children.map((child, index) => {
            if (isMdmaBlock(child)) {
              renderedBlocksRef.current.set(child.component.id, child);
              return <MdmaBlock key={child.component.id} block={child} renderers={renderers} />;
            }
            if (isPendingMdmaBlock(child)) {
              const pendingYaml = (child as { value?: string }).value;
              const pendingId = extractIdFromYaml(pendingYaml);

              const cachedBlock = pendingId ? renderedBlocksRef.current.get(pendingId) : null;
              if (cachedBlock) {
                return (
                  <MdmaBlock
                    key={cachedBlock.component.id}
                    block={cachedBlock}
                    renderers={renderers}
                  />
                );
              }

              const pendingType = extractTypeFromYaml(pendingYaml);
              if (pendingType === 'thinking' && pendingYaml) {
                const partialBlock = buildPartialThinkingBlock(pendingYaml);
                if (partialBlock) {
                  return (
                    <MdmaBlock
                      key={partialBlock.component.id}
                      block={partialBlock}
                      renderers={renderers}
                    />
                  );
                }
              }

              return <MdmaBlockLoading key={index} node={child as { value?: string }} />;
            }
            return (
              <MdastRenderer
                key={index}
                node={child as Parameters<typeof MdastRenderer>[0]['node']}
              />
            );
          })}
        </View>
      </MdmaProvider>
    </MdmaThemeProvider>
  );
}

function isMdmaBlock(node: unknown): node is MdmaBlockType {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: string }).type === 'mdmaBlock'
  );
}

/** Detect code blocks with lang="mdma" that weren't converted to MdmaBlock. */
function isPendingMdmaBlock(node: unknown): boolean {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: string }).type === 'code' &&
    'lang' in node &&
    (node as { lang: string }).lang === MDMA_LANG_TAG
  );
}
