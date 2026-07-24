import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { MdastRenderer, type MdastNode } from '../src/components/MdastRenderer.js';

const processor = unified().use(remarkParse).use(remarkGfm);

/** Parse markdown and render its first block node, as `MdmaDocument` does. */
function render(markdown: string, index = 0) {
  const tree = processor.parse(markdown) as unknown as { children: MdastNode[] };
  return mount(MdastRenderer, { props: { node: tree.children[index] } });
}

describe('MdastRenderer', () => {
  it('wraps output in the markdown content class', () => {
    expect(render('hello').find('.mdma-markdown-content').exists()).toBe(true);
  });

  it('renders headings at their depth', () => {
    expect(render('### Third').find('h3').text()).toBe('Third');
    expect(render('# First').find('h1').text()).toBe('First');
  });

  it('renders inline emphasis, strong, delete and code', () => {
    const html = render('*a* **b** ~~c~~ `d`').html();
    expect(html).toContain('<em>a</em>');
    expect(html).toContain('<strong>b</strong>');
    expect(html).toContain('<del>c</del>');
    expect(html).toContain('<code class="mdast-inline-code">d</code>');
  });

  it('renders ordered lists honouring their start index', () => {
    const ol = render('3. three\n4. four').find('ol');
    expect(ol.attributes('start')).toBe('3');
    expect(ol.findAll('li')).toHaveLength(2);
  });

  it('renders task list items as read-only checkboxes', () => {
    const wrapper = render('- [x] done\n- [ ] todo');
    const boxes = wrapper.findAll('.mdast-task-item input');
    expect(boxes).toHaveLength(2);
    expect((boxes[0].element as HTMLInputElement).checked).toBe(true);
    expect((boxes[1].element as HTMLInputElement).checked).toBe(false);
    expect(boxes[0].attributes('readonly')).toBeDefined();
  });

  it('renders fenced code with its language class', () => {
    const wrapper = render('```ts\nconst x = 1;\n```');
    expect(wrapper.find('pre.mdast-code-block code').classes()).toContain('language-ts');
    expect(wrapper.text()).toContain('const x = 1;');
  });

  it('renders a table with a header row and column alignment', () => {
    const wrapper = render('| a | b |\n| :- | --: |\n| 1 | 2 |');
    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual(['a', 'b']);
    expect(wrapper.findAll('tbody td').map((td) => td.text())).toEqual(['1', '2']);
    expect(wrapper.findAll('thead th')[1].attributes('style')).toContain('text-align: right');
  });

  it('opens links in a new tab with a safe rel', () => {
    const a = render('[site](https://example.com)').find('a');
    expect(a.attributes('href')).toBe('https://example.com');
    expect(a.attributes('target')).toBe('_blank');
    expect(a.attributes('rel')).toBe('noopener noreferrer');
  });

  it('renders images with alt text', () => {
    const img = render('![a cat](/cat.png)').find('img');
    expect(img.attributes('src')).toBe('/cat.png');
    expect(img.attributes('alt')).toBe('a cat');
  });

  it('renders blockquotes and thematic breaks', () => {
    expect(render('> quoted').find('blockquote').text()).toBe('quoted');
    expect(render('---').find('hr').exists()).toBe(true);
  });

  it('renders raw HTML as inert text rather than markup', () => {
    const wrapper = mount(MdastRenderer, {
      props: { node: { type: 'html', value: '<script>alert(1)</script>' } },
    });
    expect(wrapper.find('.mdast-raw-html').text()).toBe('<script>alert(1)</script>');
    expect(wrapper.find('script').exists()).toBe(false);
  });

  it('falls back to children for unknown container nodes', () => {
    const node: MdastNode = {
      type: 'someFutureNode',
      children: [{ type: 'text', value: 'still visible' }],
    };
    expect(mount(MdastRenderer, { props: { node } }).text()).toBe('still visible');
  });

  it('renders nothing for an unknown empty node', () => {
    const wrapper = mount(MdastRenderer, { props: { node: { type: 'mystery' } } });
    expect(wrapper.text()).toBe('');
  });
});
