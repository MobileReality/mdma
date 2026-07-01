import { MdmaDocument, type MdmaRenderCustomizations } from '@mobile-reality/mdma-renderer-react';
import type { MdmaAgentBridgeOptions } from '../bridge.js';
import type { AguiAgent } from '../types.js';
import { useMdmaAgentStream } from './use-mdma-agent-stream.js';

export interface MdmaAgentViewProps extends MdmaAgentBridgeOptions {
  /** The AG-UI agent to stream from (e.g. an `@ag-ui/client` `HttpAgent`). */
  agent: AguiAgent;
  /** Rendering customizations forwarded to each `MdmaDocument`. */
  customizations?: MdmaRenderCustomizations;
  /** Class applied to the wrapper around all rendered documents. */
  className?: string;
}

/**
 * Drop-in view: subscribes to an AG-UI agent and renders every MDMA document it streams, with
 * approvals/forms wired back into the run. For finer control, use {@link useMdmaAgentStream}.
 */
export function MdmaAgentView({ agent, customizations, className, ...options }: MdmaAgentViewProps) {
  const { documents } = useMdmaAgentStream(agent, options);
  return (
    <div className={className}>
      {documents.map((doc) => (
        <MdmaDocument
          key={doc.messageId}
          ast={doc.ast}
          store={doc.store}
          customizations={customizations}
        />
      ))}
    </div>
  );
}
