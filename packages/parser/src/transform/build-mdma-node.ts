import type { Code } from 'mdast';
import type { MdmaBlock, MdmaComponent } from '@mobile-reality/mdma-spec';

export function buildMdmaNode(codeNode: Code, component: MdmaComponent): MdmaBlock {
  return {
    type: 'mdmaBlock',
    rawYaml: codeNode.value,
    component,
    position: codeNode.position,
  };
}
