/**
 * Renders standard mdast (Markdown AST) nodes as React elements.
 * Handles headings, paragraphs, lists, blockquotes, code blocks,
 * tables, links, images, emphasis, strong, and other common Markdown constructs.
 */
import { memo, type ReactNode } from 'react';

// We use a loose node shape since mdast types vary and we want to be resilient
// during streaming when incomplete nodes may appear.
interface MdastNode {
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

export interface MdastRendererProps {
  node: MdastNode;
}

function renderChildren(nodes?: MdastNode[]): ReactNode {
  if (!nodes || nodes.length === 0) return null;
  return nodes.map((child, i) => <MdastNode key={i} node={child} />);
}

function MdastNode({ node }: { node: MdastNode }): ReactNode {
  switch (node.type) {
    // ---- Block-level ----
    case 'heading': {
      const Tag = `h${node.depth ?? 1}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return <Tag>{renderChildren(node.children)}</Tag>;
    }

    case 'paragraph':
      return <p>{renderChildren(node.children)}</p>;

    case 'blockquote':
      return <blockquote>{renderChildren(node.children)}</blockquote>;

    case 'list': {
      const Tag = node.ordered ? 'ol' : 'ul';
      return (
        <Tag start={node.ordered ? (node.start ?? 1) : undefined}>
          {renderChildren(node.children)}
        </Tag>
      );
    }

    case 'listItem': {
      if (node.checked != null) {
        return (
          <li className="mdast-task-item">
            <input type="checkbox" checked={node.checked} readOnly />
            {renderChildren(node.children)}
          </li>
        );
      }
      return <li>{renderChildren(node.children)}</li>;
    }

    case 'code':
      return (
        <pre className="mdast-code-block">
          <code className={node.lang ? `language-${node.lang}` : undefined}>{node.value}</code>
        </pre>
      );

    case 'thematicBreak':
      return <hr />;

    case 'html':
      // Render raw HTML as text for safety (no dangerouslySetInnerHTML)
      return <div className="mdast-raw-html">{node.value}</div>;

    // ---- Table ----
    case 'table': {
      const rows = node.children ?? [];
      const headerRow = rows[0];
      const bodyRows = rows.slice(1);
      return (
        <table className="mdast-table">
          {headerRow && (
            <thead>
              <tr>
                {(headerRow.children ?? []).map((cell, ci) => (
                  <th
                    key={ci}
                    style={
                      node.align?.[ci]
                        ? { textAlign: node.align[ci] as 'left' | 'center' | 'right' }
                        : undefined
                    }
                  >
                    {renderChildren(cell.children)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          {bodyRows.length > 0 && (
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri}>
                  {(row.children ?? []).map((cell, ci) => (
                    <td
                      key={ci}
                      style={
                        node.align?.[ci]
                          ? { textAlign: node.align[ci] as 'left' | 'center' | 'right' }
                          : undefined
                      }
                    >
                      {renderChildren(cell.children)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      );
    }

    // ---- Inline ----
    case 'text':
      return <>{node.value}</>;

    case 'emphasis':
      return <em>{renderChildren(node.children)}</em>;

    case 'strong':
      return <strong>{renderChildren(node.children)}</strong>;

    case 'delete':
      return <del>{renderChildren(node.children)}</del>;

    case 'inlineCode':
      return <code className="mdast-inline-code">{node.value}</code>;

    case 'link':
      return (
        <a
          href={node.url}
          title={node.title ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
        >
          {renderChildren(node.children)}
        </a>
      );

    case 'image':
      return <img src={node.url} alt={node.alt ?? ''} title={node.title ?? undefined} />;

    case 'break':
      return <br />;

    // ---- Fallback ----
    default:
      // Attempt to render children for unknown container nodes
      if (node.children) return <>{renderChildren(node.children)}</>;
      if (node.value) return <>{node.value}</>;
      return null;
  }
}

export const MdastRenderer = memo(function MdastRenderer({ node }: MdastRendererProps) {
  return (
    <div className="mdma-markdown-content">
      <MdastNode node={node} />
    </div>
  );
});
