import { memo } from 'react';
import type { ReactNode } from 'react';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import type { AgentDisplayTurn, AssistantTurn, ThinkingBlock, TextBlock, ToolUseBlock } from './types.js';

// ── Inline markdown renderer ──────────────────────────────────────────────────

function parseInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  // Matches **bold**, *italic*, `code` — in that order (longest first)
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={k++}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={k++}>{m[4]}</em>);
    else if (m[5]) parts.push(<code key={k++} className="agent-inline-code">{m[6]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function parseTableRow(line: string): string[] {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

function MarkdownText({ text }: { text: string }) {
  const result: ReactNode[] = [];
  let key = 0;
  let listItems: ReactNode[] = [];
  let tableRows: string[][] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    result.push(<ul key={key++} className="agent-text-list">{listItems}</ul>);
    listItems = [];
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const [header, ...body] = tableRows;
    result.push(
      <table key={key++} className="agent-text-table">
        <thead>
          <tr>{header.map((cell, i) => <th key={i}>{parseInline(cell)}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{parseInline(cell)}</td>)}</tr>
          ))}
        </tbody>
      </table>,
    );
    tableRows = [];
  };

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const headingMatch = line.match(/^(#{1,3}) (.+)/);
    if (headingMatch) {
      flushList(); flushTable();
      const level = headingMatch[1].length as 1 | 2 | 3;
      const Tag = `h${level}` as const;
      result.push(<Tag key={key++} className={`agent-text-h${level}`}>{parseInline(headingMatch[2])}</Tag>);
    } else if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      if (!/^\|[-| :]+\|$/.test(trimmed)) {
        tableRows.push(parseTableRow(trimmed));
      }
    } else if (/^[-*] /.test(line)) {
      flushTable();
      listItems.push(<li key={listItems.length}>{parseInline(line.slice(2))}</li>);
    } else if (/^-{3,}$/.test(trimmed)) {
      flushList(); flushTable();
      result.push(<hr key={key++} className="agent-text-hr" />);
    } else if (trimmed === '') {
      flushList(); flushTable();
    } else {
      flushList(); flushTable();
      result.push(<p key={key++}>{parseInline(line)}</p>);
    }
  }
  flushList(); flushTable();

  return <div className="agent-text-content">{result}</div>;
}

// ── Individual block renderers ────────────────────────────────────────────────

function ThinkingBlockView({ block }: { block: ThinkingBlock }) {
  return (
    <details className="agent-thinking">
      <summary className="agent-thinking-summary">
        <span className="agent-thinking-icon">
          {block.isStreaming ? (
            <span className="agent-thinking-spinner" aria-hidden="true" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" />
            </svg>
          )}
        </span>
        {block.isStreaming ? 'Thinking…' : 'Reasoning'}
      </summary>
      <div className="agent-thinking-content">
        <pre>{block.content || ' '}</pre>
      </div>
    </details>
  );
}

function TextBlockView({ block }: { block: TextBlock }) {
  if (!block.content && block.isStreaming) {
    return <span className="chat-msg-typing">Responding…</span>;
  }
  return <MarkdownText text={block.content} />;
}

function ToolUseBlockView({ block }: { block: ToolUseBlock }) {
  return (
    <div className="agent-tool-call">
      <div className="agent-tool-call-header">
        <svg className="agent-tool-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <span className="agent-tool-name">{block.name}</span>
        {block.isStreaming && <span className="agent-tool-streaming">generating…</span>}
      </div>

      <div className="agent-tool-call-body">
        {block.isStreaming ? (
          <div className="agent-tool-loading">
            <span className="agent-tool-loading-bar" />
          </div>
        ) : block.ast && block.store ? (
          <MdmaDocument ast={block.ast} store={block.store} />
        ) : block.document ? (
          <pre className="chat-msg-source">{block.document}</pre>
        ) : null}
      </div>
    </div>
  );
}

// ── Turn renderer ─────────────────────────────────────────────────────────────

export const AgentMessage = memo(function AgentMessage({ turn }: { turn: AgentDisplayTurn }) {
  if (turn.role === 'user') {
    return (
      <div className="chat-msg chat-msg--user">
        <div className="chat-msg-header">
          <span className="chat-msg-label">You</span>
        </div>
        <div className="chat-msg-body">
          <p>{turn.content}</p>
        </div>
      </div>
    );
  }

  const { blocks } = turn as AssistantTurn;

  return (
    <div className="chat-msg chat-msg--assistant">
      <div className="chat-msg-header">
        <span className="chat-msg-label">Agent</span>
      </div>
      <div className="chat-msg-body agent-blocks">
        {blocks.length === 0 ? (
          <span className="chat-msg-typing">Starting…</span>
        ) : (
          blocks.map((block) => {
            if (block.type === 'thinking') return <ThinkingBlockView key={block.id} block={block} />;
            if (block.type === 'text') return <TextBlockView key={block.id} block={block} />;
            if (block.type === 'tool_use') return <ToolUseBlockView key={block.id} block={block} />;
          })
        )}
      </div>
    </div>
  );
});
