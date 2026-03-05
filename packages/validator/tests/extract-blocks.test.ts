import { describe, it, expect } from 'vitest';
import { extractMdmaBlocksFromMarkdown } from '../src/extract-blocks.js';

describe('extractMdmaBlocksFromMarkdown', () => {
  it('extracts a single mdma block', () => {
    const md = `# Title

\`\`\`mdma
type: callout
id: notice
content: Hello
\`\`\`
`;
    const blocks = extractMdmaBlocksFromMarkdown(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].data).toEqual({
      type: 'callout',
      id: 'notice',
      content: 'Hello',
    });
    expect(blocks[0].index).toBe(0);
  });

  it('extracts multiple mdma blocks', () => {
    const md = `# Title

\`\`\`mdma
type: callout
id: first
content: A
\`\`\`

\`\`\`mdma
type: callout
id: second
content: B
\`\`\`
`;
    const blocks = extractMdmaBlocksFromMarkdown(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].data?.id).toBe('first');
    expect(blocks[1].data?.id).toBe('second');
    expect(blocks[1].index).toBe(1);
  });

  it('ignores non-mdma code blocks', () => {
    const md = `\`\`\`javascript
console.log("hello");
\`\`\`

\`\`\`mdma
type: callout
id: notice
content: Hello
\`\`\`

\`\`\`yaml
key: value
\`\`\`
`;
    const blocks = extractMdmaBlocksFromMarkdown(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].data?.id).toBe('notice');
  });

  it('handles invalid YAML gracefully', () => {
    const md = `\`\`\`mdma
- this is a list, not a mapping
- also not a mapping
\`\`\`
`;
    const blocks = extractMdmaBlocksFromMarkdown(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].data).toBeNull();
    expect(blocks[0].parseError).toBeDefined();
  });

  it('returns empty array for markdown with no mdma blocks', () => {
    const md = '# Just a heading\n\nSome text.\n';
    const blocks = extractMdmaBlocksFromMarkdown(md);
    expect(blocks).toHaveLength(0);
  });

  it('captures correct offsets', () => {
    const md = '# Title\n\n\`\`\`mdma\ntype: callout\nid: test\ncontent: Hello\n\`\`\`\n';
    const blocks = extractMdmaBlocksFromMarkdown(md);
    expect(blocks).toHaveLength(1);

    const block = blocks[0];
    // The full match starts at the ```mdma
    expect(md.slice(block.startOffset, block.startOffset + 7)).toBe('```mdma');
    // The full match ends at ```
    expect(md.slice(block.endOffset - 3, block.endOffset)).toBe('```');
    // The YAML content is between
    const yamlSlice = md.slice(block.yamlStartOffset, block.yamlEndOffset);
    expect(yamlSlice).toContain('type: callout');
  });
});
