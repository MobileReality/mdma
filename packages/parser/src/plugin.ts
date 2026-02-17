import type { Plugin } from 'unified';
import type { Root } from 'mdast';
import type { ZodType } from 'zod';
import type { MdmaRoot } from '@mdma/spec';
import { extractMdmaBlocks } from './transform/extract-mdma-blocks.js';

export interface RemarkMdmaOptions {
  /** Custom attachable schemas to validate against */
  customSchemas?: Map<string, ZodType>;
  /** Whether to throw on first error or collect all errors */
  failFast?: boolean;
}

const remarkMdma: Plugin<[RemarkMdmaOptions?], Root, MdmaRoot> = (options = {}) => {
  return (tree, file) => {
    return extractMdmaBlocks(tree, file, {
      customSchemas: options.customSchemas,
      failFast: options.failFast,
    });
  };
};

export default remarkMdma;
