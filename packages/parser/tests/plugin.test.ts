import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import type { ZodType } from 'zod';
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

  describe('streaming (unterminated fence)', () => {
    const FENCE = '```';

    it('keeps an unknown-type block pending while its fence is still open', () => {
      // Mid-stream: `approval-gat` is a truncated `approval-gate` and the closing fence hasn't
      // arrived yet. It must NOT become a block (which would flash "Unknown component type").
      const streaming = `intro\n\n${FENCE}mdma\nid: g\ntype: approval-gat`;
      const { root } = parse(streaming);
      expect(getMdmaBlocks(root)).toHaveLength(0);
      expect(root.children.some((c) => (c as { type: string }).type === 'code')).toBe(true);
    });

    it('converts the unknown-type block once the fence closes (real error surfaces)', () => {
      const done = `intro\n\n${FENCE}mdma\nid: g\ntype: totally-unknown\n${FENCE}\n`;
      const { root } = parse(done);
      const blocks = getMdmaBlocks(root);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].component.type).toBe('totally-unknown');
    });

    it('still renders a KNOWN valid type live, even with the fence open', () => {
      // We only withhold unknown types — valid known types keep rendering live during streaming.
      const streaming = `${FENCE}mdma\nid: b\ntype: button\ntext: Go\nonAction: go`;
      const { root } = parse(streaming);
      const blocks = getMdmaBlocks(root);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].component.type).toBe('button');
    });
  });

  describe('custom component', () => {
    const FENCE = '```';

    function parseWith(
      md: string,
      customSchemas?: Map<string, ZodType>,
    ): { root: MdmaRoot; messages: string[] } {
      const processor = unified().use(remarkParse).use(remarkMdma, { customSchemas });
      const file = new VFile(md);
      const tree = processor.parse(file);
      const result = processor.runSync(tree, file);
      return {
        root: result as unknown as MdmaRoot,
        messages: file.messages.map((m) => m.message),
      };
    }

    const signaturePad = `${FENCE}mdma
id: sig
type: custom
name: signature-pad
props:
  penColor: black
  required: true
actions:
  onCapture: save-signature
${FENCE}
`;

    it('parses the envelope with open props when no schema is registered', () => {
      const { root, messages } = parseWith(signaturePad);
      expect(messages).toHaveLength(0);

      const blocks = getMdmaBlocks(root);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].component.type).toBe('custom');
      expect(blocks[0].component.id).toBe('sig');
      if (blocks[0].component.type === 'custom') {
        expect(blocks[0].component.name).toBe('signature-pad');
        expect(blocks[0].component.props).toEqual({ penColor: 'black', required: true });
        expect(blocks[0].component.actions).toEqual({ onCapture: 'save-signature' });
      }
    });

    it('requires a non-empty name', () => {
      const md = `${FENCE}mdma
id: sig
type: custom
${FENCE}
`;
      const { messages } = parseWith(md);
      expect(messages.some((m) => m.includes('name'))).toBe(true);
    });

    it('tightens props against a schema registered under the name', () => {
      const schemas = new Map<string, ZodType>([
        ['signature-pad', z.object({ penColor: z.string(), required: z.boolean() })],
      ]);
      const { messages } = parseWith(signaturePad, schemas);
      expect(messages).toHaveLength(0);
    });

    it('reports prop errors under a props.* path when the schema rejects', () => {
      const schemas = new Map<string, ZodType>([
        ['signature-pad', z.object({ penColor: z.string(), required: z.boolean() })],
      ]);
      const bad = `${FENCE}mdma
id: sig
type: custom
name: signature-pad
props:
  penColor: 123
  required: true
${FENCE}
`;
      const { messages } = parseWith(bad, schemas);
      expect(messages.some((m) => m.startsWith('props.penColor'))).toBe(true);
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
