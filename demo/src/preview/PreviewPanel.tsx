import { useMemo } from 'react';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import { customizations } from '../custom-components.js';
import type { AgentDisplayTurn, AssistantTurn, ToolUseBlock } from '../agent/types.js';

interface PreviewPanelProps {
  turns: AgentDisplayTurn[];
}

interface LatestMdma {
  block: ToolUseBlock;
  turnId: string;
}

function findLatestMdmaBlock(turns: AgentDisplayTurn[]): LatestMdma | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.role !== 'assistant') continue;
    const blocks = (turn as AssistantTurn).blocks;
    for (let j = blocks.length - 1; j >= 0; j--) {
      const block = blocks[j];
      if (block.type === 'tool_use') return { block, turnId: turn.id };
    }
  }
  return null;
}

export function PreviewPanel({ turns }: PreviewPanelProps) {
  const latest = useMemo(() => findLatestMdmaBlock(turns), [turns]);

  const status: 'idle' | 'streaming' | 'ready' = !latest
    ? 'idle'
    : latest.block.isStreaming
      ? 'streaming'
      : latest.block.ast && latest.block.store
        ? 'ready'
        : 'streaming';

  const statusLabel =
    status === 'idle' ? 'idle' : status === 'streaming' ? 'generating' : 'ready';
  const statusClass =
    status === 'idle'
      ? 'preview-pane-status--idle'
      : status === 'streaming'
        ? 'preview-pane-status--validating'
        : 'preview-pane-status--ready';

  return (
    <div className="preview-pane">
      <div className="preview-pane-header">
        <span className="preview-pane-title">Live MDMA Preview</span>
        <span className={`preview-pane-status ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className="preview-pane-body">
        {!latest ? (
          <div className="preview-pane-empty">
            <p className="preview-pane-empty-title">Insurance claim flow</p>
            <p className="preview-pane-empty-hint">
              Start the chat on the left. As the agent emits MDMA blocks, they'll be rendered here.
            </p>
          </div>
        ) : latest.block.isStreaming || !latest.block.ast || !latest.block.store ? (
          <div className="preview-pane-empty">
            <p className="preview-pane-empty-title">Generating…</p>
            <p className="preview-pane-empty-hint">
              The agent is still emitting this step. The rendered output will appear when the block
              is complete.
            </p>
          </div>
        ) : (
          <MdmaDocument
            ast={latest.block.ast}
            store={latest.block.store}
            customizations={customizations}
          />
        )}
      </div>
    </div>
  );
}
