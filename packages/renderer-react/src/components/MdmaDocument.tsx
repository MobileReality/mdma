import type { MdmaRoot, MdmaBlock as MdmaBlockType } from '@mobile-reality/mdma-spec';
import { MDMA_LANG_TAG } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { useRef, useMemo, type ComponentType } from 'react';
import { MdmaProvider } from '../context/MdmaProvider.js';
import {
  ElementOverridesProvider,
  type ElementOverrides,
} from '../context/ElementOverridesContext.js';
import { MdmaBlock } from './MdmaBlock.js';
import { MdmaBlockLoading } from './MdmaBlockLoading.js';
import { MdastRenderer } from './MdastRenderer.js';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

/**
 * A component entry can be either:
 * - A `ComponentType` — shorthand for a full renderer override.
 * - A config object — with an optional `renderer` and/or `elements`
 *   for sub-element overrides (e.g. form inputs, checkboxes).
 */
export type ComponentEntry =
  | ComponentType<MdmaBlockRendererProps>
  | {
      renderer?: ComponentType<MdmaBlockRendererProps>;
      elements?: Record<string, ComponentType<any>>;
    };

/** Rendering customizations — a single map keyed by component type. */
export interface MdmaRenderCustomizations {
  /**
   * Component-level overrides keyed by MDMA component type name.
   *
   * @example
   * ```ts
   * components: {
   *   button: CustomButtonRenderer,          // full renderer
   *   form: { elements: { input: GlassInput } }, // sub-element overrides
   * }
   * ```
   */
  components?: Record<string, ComponentEntry>;
  /** Named option lists that form select fields can reference by string (e.g. `options: countries`). */
  dataSources?: Record<string, Array<{ label: string; value: string }>>;
}

export interface MdmaDocumentProps {
  ast: MdmaRoot;
  store: DocumentStore;
  /** Rendering customizations (component renderers + element overrides). */
  customizations?: MdmaRenderCustomizations;
  className?: string;
}

/** Check if an entry is a config object (has `renderer` or `elements`) rather than a component. */
function isComponentConfig(entry: ComponentEntry): entry is {
  renderer?: ComponentType<MdmaBlockRendererProps>;
  elements?: Record<string, ComponentType<unknown>>;
} {
  return (
    typeof entry === 'object' && entry !== null && ('renderer' in entry || 'elements' in entry)
  );
}

/** Split a unified `components` map into the internal renderer + elementOverrides formats. */
function splitComponents(components?: Record<string, ComponentEntry>) {
  if (!components) return { renderers: undefined, elementOverrides: undefined };

  const renderers: Record<string, ComponentType<MdmaBlockRendererProps>> = {};
  const elementOverrides: ElementOverrides = {};

  for (const [key, entry] of Object.entries(components)) {
    if (isComponentConfig(entry)) {
      if (entry.renderer) renderers[key] = entry.renderer;
      if (entry.elements) elementOverrides[key] = entry.elements;
    } else {
      // Function components, React.memo, forwardRef, etc.
      renderers[key] = entry as ComponentType<MdmaBlockRendererProps>;
    }
  }

  return {
    renderers: Object.keys(renderers).length > 0 ? renderers : undefined,
    elementOverrides: Object.keys(elementOverrides).length > 0 ? elementOverrides : undefined,
  };
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
 * Build a synthetic MdmaBlock for a thinking component from partial YAML.
 * This allows the thinking block to render streamed content instead of
 * showing a loading skeleton.
 */
function buildPartialThinkingBlock(yaml: string): MdmaBlockType | null {
  const id = extractIdFromYaml(yaml);
  if (!id) return null;

  // Extract label (single-line value after "label:")
  const labelMatch = yaml.match(/^\s*label:\s*(.+)$/m);
  const label = labelMatch ? labelMatch[1].trim() : undefined;

  // Extract content — handles both YAML block scalar (|) and inline string
  let content = '';
  const contentBlockMatch = yaml.match(/^\s*content:\s*\|\s*\n([\s\S]*)$/m);
  if (contentBlockMatch) {
    // Block scalar: grab everything after "content: |" up to the next
    // top-level YAML key or end of string. Lines are indented by ≥2 spaces.
    const rawBlock = contentBlockMatch[1];
    const lines: string[] = [];
    for (const line of rawBlock.split('\n')) {
      // A non-indented non-empty line means a new YAML key — stop.
      if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t')) break;
      // Strip the common 2-space indent used by YAML block scalars
      lines.push(line.replace(/^ {1,2}/, ''));
    }
    content = lines.join('\n').trimEnd();
  } else {
    // Inline string: content: "some text" or content: some text
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

export function MdmaDocument({ ast, store, customizations, className }: MdmaDocumentProps) {
  const { renderers, elementOverrides } = useMemo(
    () => splitComponents(customizations?.components),
    [customizations?.components],
  );

  // Cache of successfully parsed blocks by component ID. Prevents flickering
  // during streaming when a block alternates between parsed and pending states
  // as incomplete YAML temporarily fails to validate.
  const renderedBlocksRef = useRef<Map<string, MdmaBlockType>>(new Map());

  return (
    <MdmaProvider store={store} dataSources={customizations?.dataSources}>
      <ElementOverridesProvider value={elementOverrides}>
        <div className={`mdma-document ${className ?? ''}`}>
          {ast.children.map((child, index) => {
            if (isMdmaBlock(child)) {
              // Cache this successfully parsed block
              renderedBlocksRef.current.set(child.component.id, child);
              return <MdmaBlock key={child.component.id} block={child} renderers={renderers} />;
            }
            // Incomplete MDMA blocks (still streaming or failed validation)
            if (isPendingMdmaBlock(child)) {
              const pendingYaml = (child as { value?: string }).value;
              const pendingId = extractIdFromYaml(pendingYaml);

              // If this block was previously rendered, keep showing the rendered
              // version instead of flickering back to the loading skeleton.
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

              // Thinking blocks stream their content live instead of showing
              // a loading skeleton — build a synthetic block from partial YAML.
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
            // Render standard Markdown nodes (headings, paragraphs, lists, etc.)
            return (
              <MdastRenderer
                key={index}
                node={child as Parameters<typeof MdastRenderer>[0]['node']}
              />
            );
          })}
        </div>
      </ElementOverridesProvider>
    </MdmaProvider>
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

/** Detect code blocks with lang="mdma" that weren't converted to MdmaBlock
 *  (incomplete YAML during streaming or validation failure). */
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
