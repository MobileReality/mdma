import type { MdmaRoot, MdmaBlock as MdmaBlockType } from '@mdma/spec';
import { MDMA_LANG_TAG } from '@mdma/spec';
import type { DocumentStore } from '@mdma/runtime';
import { useRef, type ComponentType } from 'react';
import { MdmaProvider } from '../context/MdmaProvider.js';
import { MdmaBlock } from './MdmaBlock.js';
import { MdmaBlockLoading } from './MdmaBlockLoading.js';
import { MdastRenderer } from './MdastRenderer.js';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

export interface MdmaDocumentProps {
  ast: MdmaRoot;
  store: DocumentStore;
  renderers?: Record<string, ComponentType<MdmaBlockRendererProps>>;
  className?: string;
}

/** Extract the `id` field from partial YAML content. */
function extractIdFromYaml(yaml?: string): string | null {
  if (!yaml) return null;
  const match = yaml.match(/^\s*id:\s*(\S+)/m);
  return match ? match[1] : null;
}

export function MdmaDocument({ ast, store, renderers, className }: MdmaDocumentProps) {
  // Cache of successfully parsed blocks by component ID. Prevents flickering
  // during streaming when a block alternates between parsed and pending states
  // as incomplete YAML temporarily fails to validate.
  const renderedBlocksRef = useRef<Map<string, MdmaBlockType>>(new Map());

  return (
    <MdmaProvider store={store}>
      <div className={`mdma-document ${className ?? ''}`}>
        {ast.children.map((child, index) => {
          if (isMdmaBlock(child)) {
            // Cache this successfully parsed block
            renderedBlocksRef.current.set(child.component.id, child);
            return <MdmaBlock key={child.component.id} block={child} renderers={renderers} />;
          }
          // Incomplete MDMA blocks (still streaming or failed validation)
          if (isPendingMdmaBlock(child)) {
            // If this block was previously rendered, keep showing the rendered
            // version instead of flickering back to the loading skeleton.
            const pendingId = extractIdFromYaml((child as { value?: string }).value);
            const cachedBlock = pendingId ? renderedBlocksRef.current.get(pendingId) : null;
            if (cachedBlock) {
              return <MdmaBlock key={cachedBlock.component.id} block={cachedBlock} renderers={renderers} />;
            }
            return <MdmaBlockLoading key={index} node={child as { value?: string }} />;
          }
          // Render standard Markdown nodes (headings, paragraphs, lists, etc.)
          return <MdastRenderer key={index} node={child as Parameters<typeof MdastRenderer>[0]['node']} />;
        })}
      </div>
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
