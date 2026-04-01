import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VFile } from 'vfile';
import { remarkMdma } from '../src/index.js';
import type { MdmaRoot, MdmaBlock } from '@mobile-reality/mdma-spec';

const __dirname = dirname(fileURLToPath(import.meta.url));

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf-8');
}

function parse(md: string): { root: MdmaRoot; messages: string[] } {
  const processor = unified().use(remarkParse).use(remarkMdma);
  const file = new VFile(md);
  const tree = processor.parse(file);
  const result = processor.runSync(tree, file);
  return {
    root: result as unknown as MdmaRoot,
    messages: file.messages.map((m) => m.message),
  };
}

function getMdmaBlocks(root: MdmaRoot): MdmaBlock[] {
  return root.children.filter((n): n is MdmaBlock => (n as MdmaBlock).type === 'mdmaBlock');
}

describe('remarkMdma plugin', () => {
  describe('simple-form.md', () => {
    it('parses a single form component', () => {
      const { root, messages } = parse(fixture('simple-form.md'));
      expect(messages).toHaveLength(0);

      const blocks = getMdmaBlocks(root);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].component.type).toBe('form');
      expect(blocks[0].component.id).toBe('intake-form');

      if (blocks[0].component.type === 'form') {
        expect(blocks[0].component.fields).toHaveLength(2);
        expect(blocks[0].component.fields[0].sensitive).toBe(true);
        expect(blocks[0].component.onSubmit).toBe('submit-intake');
      }
    });

    it('preserves non-mdma markdown nodes', () => {
      const { root } = parse(fixture('simple-form.md'));
      const types = root.children.map((c) => c.type);
      expect(types).toContain('heading');
      expect(types).toContain('paragraph');
      expect(types).toContain('mdmaBlock');
    });
  });

  describe('multi-component.md', () => {
    it('parses multiple component types', () => {
      const { root, messages } = parse(fixture('multi-component.md'));
      expect(messages).toHaveLength(0);

      const blocks = getMdmaBlocks(root);
      expect(blocks).toHaveLength(4);

      const types = blocks.map((b) => b.component.type);
      expect(types).toEqual(['form', 'tasklist', 'approval-gate', 'button']);
    });

    it('preserves component IDs', () => {
      const { root } = parse(fixture('multi-component.md'));
      const blocks = getMdmaBlocks(root);
      const ids = blocks.map((b) => b.component.id);
      expect(ids).toEqual(['triage-form', 'triage-checklist', 'manager-approval', 'notify-slack']);
    });
  });

  describe('invalid-schema.md', () => {
    it('collects validation errors', () => {
      const { messages } = parse(fixture('invalid-schema.md'));
      expect(messages.length).toBeGreaterThan(0);
    });

    it('reports errors for empty form fields', () => {
      const { messages } = parse(fixture('invalid-schema.md'));
      const hasFieldsError = messages.some((m) => m.includes('fields'));
      expect(hasFieldsError).toBe(true);
    });

    it('passes through unknown component type as generic block', () => {
      const { root, messages } = parse(fixture('invalid-schema.md'));
      // Unknown types are now passed through as generic blocks (no error)
      const hasUnknown = messages.some((m) => m.includes('Unknown component type'));
      expect(hasUnknown).toBe(false);
      // The unknown type block should still appear in the AST as an mdmaBlock
      const blocks = root.children.filter(
        (c: { type: string; component?: { type: string } }) =>
          c.type === 'mdmaBlock' && c.component?.type === 'super-custom-thing',
      );
      expect(blocks).toHaveLength(1);
    });
  });

  describe('complex-bindings.md', () => {
    it('parses components with binding expressions', () => {
      const { root, messages } = parse(fixture('complex-bindings.md'));
      expect(messages).toHaveLength(0);

      const blocks = getMdmaBlocks(root);
      const table = blocks.find((b) => b.component.type === 'table');
      expect(table).toBeDefined();
      if (table && table.component.type === 'table') {
        expect(table.component.data).toBe('{{results}}');
        expect(table.component.visible).toBe('{{show_table}}');
      }
    });
  });

  describe('edge cases', () => {
    it('ignores non-mdma code blocks', () => {
      const md = '```javascript\nconsole.log("hello");\n```';
      const { root, messages } = parse(md);
      expect(messages).toHaveLength(0);
      expect(getMdmaBlocks(root)).toHaveLength(0);
    });

    it('handles document with no mdma blocks', () => {
      const { root, messages } = parse('# Just markdown\n\nSome text.');
      expect(messages).toHaveLength(0);
      expect(getMdmaBlocks(root)).toHaveLength(0);
    });

    it('detects duplicate IDs', () => {
      const md = `
\`\`\`mdma
id: dup
type: callout
content: First
\`\`\`

\`\`\`mdma
id: dup
type: callout
content: Second
\`\`\`
`;
      const { messages } = parse(md);
      expect(messages.some((m) => m.includes('Duplicate'))).toBe(true);
    });
  });
});
