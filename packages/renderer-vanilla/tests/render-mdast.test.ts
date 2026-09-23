import { describe, expect, it } from 'vitest';
import { renderMdast } from '../src/markdown/render-mdast.js';
import { parseAst } from './helpers/doc.js';

async function renderMarkdown(markdown: string): Promise<HTMLElement> {
  const ast = await parseAst(markdown);
  const root = document.createElement('div');
  for (const child of ast.children) root.appendChild(renderMdast(child as never));
  return root;
}

describe('renderMdast', () => {
  it('wraps every node in the markdown content class', async () => {
    const root = await renderMarkdown('Hello');
    expect(root.firstElementChild?.className).toBe('mdma-markdown-content');
  });

  it('renders headings at their depth', async () => {
    const root = await renderMarkdown('# One\n\n### Three\n');
    expect(root.querySelector('h1')?.textContent).toBe('One');
    expect(root.querySelector('h3')?.textContent).toBe('Three');
  });

  it('renders inline emphasis, strong, code, and links', async () => {
    const root = await renderMarkdown('*a* **b** `c` [d](https://example.com)');
    expect(root.querySelector('em')?.textContent).toBe('a');
    expect(root.querySelector('strong')?.textContent).toBe('b');
    expect(root.querySelector('code.mdast-inline-code')?.textContent).toBe('c');

    const link = root.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders ordered and unordered lists', async () => {
    const root = await renderMarkdown('- a\n- b\n');
    expect(root.querySelectorAll('ul li')).toHaveLength(2);

    const ordered = await renderMarkdown('3. a\n4. b\n');
    expect(ordered.querySelector('ol')?.getAttribute('start')).toBe('3');
  });

  it('renders a task list item with a read-only checkbox', async () => {
    const root = await renderMarkdown('- [x] done\n');
    const box = root.querySelector<HTMLInputElement>('.mdast-task-item input');
    expect(box?.checked).toBe(true);
    expect(box?.hasAttribute('readonly')).toBe(true);
  });

  it('renders a fenced code block with its language class', async () => {
    const root = await renderMarkdown('```ts\nconst a = 1;\n```\n');
    expect(root.querySelector('pre.mdast-code-block code')?.className).toBe('language-ts');
  });

  it('renders a GFM table with alignment', async () => {
    const root = await renderMarkdown('| a | b |\n| :-- | --: |\n| 1 | 2 |\n');
    expect(root.querySelectorAll('table.mdast-table thead th')).toHaveLength(2);
    expect(root.querySelectorAll('tbody td')).toHaveLength(2);
    expect(root.querySelector('thead th')?.getAttribute('style')).toContain('text-align: left');
  });

  it('renders raw HTML as text, never as live markup', async () => {
    const root = await renderMarkdown('<script>alert(1)</script>\n');
    expect(root.querySelector('script')).toBeNull();
    expect(root.querySelector('.mdast-raw-html')?.textContent).toBe('<script>alert(1)</script>');
  });
});
