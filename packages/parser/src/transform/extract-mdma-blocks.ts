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
  const source = typeof file.value === 'string' ? file.value : String(file.value ?? '');

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

    // 2b. While the fence is still open (streaming), a valid-YAML-but-unknown-type block is almost
    // always a half-streamed type name (e.g. `approval-gat` before `approval-gate` completes).
    // Leave it as a pending code node so the renderer shows a loading skeleton instead of flashing
    // "Unknown component type". Once the fence closes, a still-unknown type falls through and
    // renders the proper error.
    if (validation.unknownType && !isFenceTerminated(node, source)) {
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

/**
 * Is the fenced code block terminated by a closing fence? During streaming, remark auto-closes an
 * open fence at EOF, so the mdast `code` node exists before its closing ``` has arrived. We detect
 * that by slicing the original source for this node and checking whether its last non-empty line is
 * a bare fence. Defaults to `true` when position offsets are unavailable, so non-streaming parses
 * (and any consumer without position tracking) are unaffected.
 */
function isFenceTerminated(node: Code, source: string): boolean {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (start == null || end == null || !source) return true;

  const block = source.slice(start, end);
  const lines = block.split('\n');
  for (let i = lines.length - 1; i >= 1; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === '') continue;
    return /^(`{3,}|~{3,})$/.test(trimmed);
  }
  return false;
}
