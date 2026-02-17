import type { Node } from 'mdast';
import type { MdmaComponent } from '../schemas/components/index.js';

/** An mdma fenced code block, parsed from the raw Code node */
export interface MdmaBlock extends Node {
  type: 'mdmaBlock';
  rawYaml: string;
  component: MdmaComponent;
}

/** Extended root that may contain MdmaBlock nodes interspersed with regular mdast nodes */
export interface MdmaRoot {
  type: 'root';
  children: (Node | MdmaBlock)[];
}
