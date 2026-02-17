import type { MdmaRoot, MdmaBlock } from '@mdma/spec';
import { extractBindings, type BindingReference } from './extract-bindings.js';

export interface BindingGraph {
  /** All binding references found in the document */
  bindings: BindingReference[];
  /** Unique binding paths referenced */
  paths: Set<string>;
  /** Map from component ID to its binding references */
  byComponent: Map<string, BindingReference[]>;
}

/** Build a dependency graph of all bindings in an MDMA document */
export function buildBindingGraph(root: MdmaRoot): BindingGraph {
  const bindings: BindingReference[] = [];
  const paths = new Set<string>();
  const byComponent = new Map<string, BindingReference[]>();

  for (const child of root.children) {
    if (isMdmaBlock(child)) {
      const refs = extractBindings(child.component.id, child.component);
      for (const ref of refs) {
        bindings.push(ref);
        paths.add(ref.path);
        const existing = byComponent.get(ref.componentId) ?? [];
        existing.push(ref);
        byComponent.set(ref.componentId, existing);
      }
    }
  }

  return { bindings, paths, byComponent };
}

function isMdmaBlock(node: unknown): node is MdmaBlock {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: string }).type === 'mdmaBlock'
  );
}
