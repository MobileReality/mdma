import { type Child, append, el } from '../dom/el.js';

/**
 * Loose node shape: mdast types vary, and during streaming an incomplete node
 * can appear, so every branch degrades instead of throwing.
 */
export interface MdastNode {
  type: string;
  children?: MdastNode[];
  value?: string;
  depth?: number;
  ordered?: boolean;
  start?: number;
  checked?: boolean | null;
  lang?: string;
  url?: string;
  title?: string;
  alt?: string;
  align?: (string | null)[];
}

type Heading = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

function renderChildren(nodes?: MdastNode[]): Child[] {
  if (!nodes) return [];
  return nodes.map((child) => renderNode(child));
}

function alignStyle(align: (string | null)[] | undefined, index: number) {
  const value = align?.[index];
  return value ? { 'text-align': value } : undefined;
}

function renderTable(node: MdastNode): HTMLElement {
  const rows = node.children ?? [];
  const [headerRow, ...bodyRows] = rows;
  const sections: Child[] = [];

  if (headerRow) {
    sections.push(
      el('thead', {}, [
        el(
          'tr',
          {},
          (headerRow.children ?? []).map((cell, index) =>
            el('th', { style: alignStyle(node.align, index) }, renderChildren(cell.children)),
          ),
        ),
      ]),
    );
  }

  if (bodyRows.length > 0) {
    sections.push(
      el(
        'tbody',
        {},
        bodyRows.map((row) =>
          el(
            'tr',
            {},
            (row.children ?? []).map((cell, index) =>
              el('td', { style: alignStyle(node.align, index) }, renderChildren(cell.children)),
            ),
          ),
        ),
      ),
    );
  }

  return el('table', { class: 'mdast-table' }, sections);
}

function renderNode(node: MdastNode): Child {
  switch (node.type) {
    case 'heading':
      return el(`h${node.depth ?? 1}` as Heading, {}, renderChildren(node.children));
    case 'paragraph':
      return el('p', {}, renderChildren(node.children));
    case 'blockquote':
      return el('blockquote', {}, renderChildren(node.children));
    case 'list':
      return el(
        node.ordered ? 'ol' : 'ul',
        { start: node.ordered ? (node.start ?? 1) : undefined },
        renderChildren(node.children),
      );
    case 'listItem': {
      if (node.checked == null) return el('li', {}, renderChildren(node.children));
      const box = el('input', { type: 'checkbox', readonly: true });
      box.checked = node.checked;
      return el('li', { class: 'mdast-task-item' }, [box, ...renderChildren(node.children)]);
    }
    case 'code':
      return el('pre', { class: 'mdast-code-block' }, [
        el('code', { class: node.lang ? `language-${node.lang}` : undefined }, [node.value]),
      ]);
    case 'thematicBreak':
      return el('hr');
    case 'html':
      // Rendered as text, never parsed — untrusted model output must not become live markup.
      return el('div', { class: 'mdast-raw-html' }, [node.value]);
    case 'table':
      return renderTable(node);
    case 'text':
      return node.value;
    case 'emphasis':
      return el('em', {}, renderChildren(node.children));
    case 'strong':
      return el('strong', {}, renderChildren(node.children));
    case 'delete':
      return el('del', {}, renderChildren(node.children));
    case 'inlineCode':
      return el('code', { class: 'mdast-inline-code' }, [node.value]);
    case 'link':
      return el(
        'a',
        {
          href: node.url,
          title: node.title,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        renderChildren(node.children),
      );
    case 'image':
      return el('img', { src: node.url, alt: node.alt ?? '', title: node.title });
    case 'break':
      return el('br');
    default: {
      if (node.children) {
        const fragment = el('span', {}, renderChildren(node.children));
        return fragment;
      }
      return node.value ?? null;
    }
  }
}

/** Render one standard Markdown node into its `.mdma-markdown-content` wrapper. */
export function renderMdast(node: MdastNode): HTMLElement {
  const root = el('div', { class: 'mdma-markdown-content' });
  append(root, [renderNode(node)]);
  return root;
}
