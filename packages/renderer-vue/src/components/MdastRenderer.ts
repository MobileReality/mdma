/**
 * Renders standard mdast (Markdown AST) nodes as Vue vnodes.
 * Handles headings, paragraphs, lists, blockquotes, code blocks,
 * tables, links, images, emphasis, strong, and other common Markdown constructs.
 */
import { defineComponent, h, type PropType, type VNodeChild } from 'vue';

// We use a loose node shape since mdast types vary and we want to be resilient
// during streaming when incomplete nodes may appear.
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

export type MdastRendererProps = {
  node: MdastNode;
};

function renderChildren(nodes?: MdastNode[]): VNodeChild[] {
  if (!nodes || nodes.length === 0) return [];
  return nodes.map((child) => renderNode(child));
}

/** Column alignment, when the table declares one. */
function alignStyle(align: (string | null)[] | undefined, index: number) {
  const value = align?.[index];
  return value ? { textAlign: value as 'left' | 'center' | 'right' } : undefined;
}

function renderNode(node: MdastNode): VNodeChild {
  switch (node.type) {
    // ---- Block-level ----
    case 'heading':
      return h(`h${node.depth ?? 1}`, renderChildren(node.children));

    case 'paragraph':
      return h('p', renderChildren(node.children));

    case 'blockquote':
      return h('blockquote', renderChildren(node.children));

    case 'list':
      return h(
        node.ordered ? 'ol' : 'ul',
        { start: node.ordered ? (node.start ?? 1) : undefined },
        renderChildren(node.children),
      );

    case 'listItem':
      if (node.checked != null) {
        return h('li', { class: 'mdast-task-item' }, [
          h('input', { type: 'checkbox', checked: node.checked, readonly: true }),
          ...renderChildren(node.children),
        ]);
      }
      return h('li', renderChildren(node.children));

    case 'code':
      return h('pre', { class: 'mdast-code-block' }, [
        h('code', { class: node.lang ? `language-${node.lang}` : undefined }, node.value),
      ]);

    case 'thematicBreak':
      return h('hr');

    case 'html':
      // Render raw HTML as text for safety (never v-html)
      return h('div', { class: 'mdast-raw-html' }, node.value);

    // ---- Table ----
    case 'table': {
      const rows = node.children ?? [];
      const headerRow = rows[0];
      const bodyRows = rows.slice(1);
      const sections: VNodeChild[] = [];

      if (headerRow) {
        sections.push(
          h('thead', [
            h(
              'tr',
              (headerRow.children ?? []).map((cell, ci) =>
                h('th', { style: alignStyle(node.align, ci) }, renderChildren(cell.children)),
              ),
            ),
          ]),
        );
      }
      if (bodyRows.length > 0) {
        sections.push(
          h(
            'tbody',
            bodyRows.map((row) =>
              h(
                'tr',
                (row.children ?? []).map((cell, ci) =>
                  h('td', { style: alignStyle(node.align, ci) }, renderChildren(cell.children)),
                ),
              ),
            ),
          ),
        );
      }
      return h('table', { class: 'mdast-table' }, sections);
    }

    // ---- Inline ----
    case 'text':
      return node.value;

    case 'emphasis':
      return h('em', renderChildren(node.children));

    case 'strong':
      return h('strong', renderChildren(node.children));

    case 'delete':
      return h('del', renderChildren(node.children));

    case 'inlineCode':
      return h('code', { class: 'mdast-inline-code' }, node.value);

    case 'link':
      return h(
        'a',
        {
          href: node.url,
          title: node.title ?? undefined,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        renderChildren(node.children),
      );

    case 'image':
      return h('img', { src: node.url, alt: node.alt ?? '', title: node.title ?? undefined });

    case 'break':
      return h('br');

    // ---- Fallback ----
    default:
      // Attempt to render children for unknown container nodes
      if (node.children) return renderChildren(node.children);
      if (node.value) return node.value;
      return null;
  }
}

export const MdastRenderer = defineComponent({
  name: 'MdastRenderer',
  props: {
    node: { type: Object as PropType<MdastNode>, required: true },
  },
  setup(props) {
    return () => h('div', { class: 'mdma-markdown-content' }, [renderNode(props.node)]);
  },
});
