import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';

export interface ThinkingBlock {
  id: string;
  type: 'thinking';
  content: string;
  isStreaming: boolean;
}

export interface TextBlock {
  id: string;
  type: 'text';
  content: string;
  isStreaming: boolean;
}

export interface ToolUseBlock {
  id: string;
  type: 'tool_use';
  /** Anthropic's tool_use id (toolu_…), needed for tool_result replies. */
  toolUseId: string;
  name: string;
  /** Accumulated MDMA markdown content (empty while streaming). */
  document: string;
  ast: MdmaRoot | null;
  store: DocumentStore | null;
  isStreaming: boolean;
}

export type AgentBlock = ThinkingBlock | TextBlock | ToolUseBlock;

export interface UserTurn {
  id: string;
  role: 'user';
  content: string;
  /**
   * When true, the turn is not rendered in the chat UI but is still part of
   * the API history sent to the agent. Used by the Insurance Preview to
   * carry "step N submitted, please continue" signals without exposing
   * synthetic prompts (or form data) to the user.
   */
  hidden?: boolean;
}

export interface AssistantTurn {
  id: string;
  role: 'assistant';
  blocks: AgentBlock[];
}

export type AgentDisplayTurn = UserTurn | AssistantTurn;
