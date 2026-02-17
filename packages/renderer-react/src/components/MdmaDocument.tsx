import type { MdmaRoot, MdmaBlock as MdmaBlockType } from '@mdma/spec';
import type { DocumentStore } from '@mdma/runtime';
import type { ComponentType } from 'react';
import { MdmaProvider } from '../context/MdmaProvider.js';
import { MdmaBlock } from './MdmaBlock.js';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

export interface MdmaDocumentProps {
  ast: MdmaRoot;
  store: DocumentStore;
  renderers?: Record<string, ComponentType<MdmaBlockRendererProps>>;
  className?: string;
}

export function MdmaDocument({ ast, store, renderers, className }: MdmaDocumentProps) {
  return (
    <MdmaProvider store={store}>
      <div className={`mdma-document ${className ?? ''}`}>
        {ast.children.map((child, index) => {
          if (isMdmaBlock(child)) {
            return <MdmaBlock key={child.component.id} block={child} renderers={renderers} />;
          }
          // Non-MDMA nodes are rendered as-is (in a real implementation,
          // these would be rendered via rehype-react or similar)
          return <div key={index} className="mdma-markdown-content" />;
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
