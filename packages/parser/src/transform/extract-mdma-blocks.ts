import { visit, SKIP } from 'unist-util-visit';
import type { Code, Root } from 'mdast';
import type { VFile } from 'vfile';
import type { ZodType } from 'zod';
import { MDMA_LANG_TAG, type MdmaRoot } from '@mobile-reality/mdma-spec';
import { parseYaml } from './parse-yaml.js';
import { validateComponent } from './validate-component.js';
import { buildMdmaNode } from './build-mdma-node.js';

export interface ExtractOptions {
  customSchemas?: Map<string, ZodType>;
  failFast?: boolean;
}

export function extractMdmaBlocks(tree: Root, file: VFile, options: ExtractOptions = {}): MdmaRoot {
  const ids = new Set<string>();

  visit(tree, 'code', (node: Code, index, parent) => {
    if (node.lang !== MDMA_LANG_TAG) return;

    // 1. Parse YAML
    const parseResult = parseYaml(node.value, node.position);
    if (!parseResult.ok) {
      console.warn('[mdma] YAML parse error:', parseResult.error.message);
      file.message(parseResult.error.message, node.position);
      if (options.failFast) throw parseResult.error;
      return;
    }

    // 2. Validate against schema
    const validation = validateComponent(parseResult.data, options.customSchemas, node.position);
    if (!validation.ok) {
      console.warn(
        `[mdma] Validation failed for component type="${parseResult.data.type}" id="${parseResult.data.id ?? '?'}":`,
        validation.errors.map((e) => e.message).join('; '),
      );
      for (const err of validation.errors) {
        file.message(err.message, node.position);
      }
      if (options.failFast) throw validation.errors[0];
      return;
    }

    // 3. Check for duplicate IDs
    const id = validation.component.id;
    if (ids.has(id)) {
      const msg = `Duplicate component ID: "${id}"`;
      file.message(msg, node.position);
      if (options.failFast) {
        throw new Error(msg);
      }
    }
    ids.add(id);

    // 4. Replace code node with MdmaBlock
    const mdmaNode = buildMdmaNode(node, validation.component);
    if (parent && typeof index === 'number') {
      (parent.children as unknown[])[index] = mdmaNode;
    }

    return SKIP;
  });

  return tree as unknown as MdmaRoot;
}
