import type { MdmaRoot } from '@mdma/spec';
import type { DocumentStore } from '@mdma/runtime';

export interface ChatMsg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  /** Parsed AST for assistant messages (null while streaming / on error) */
  ast: MdmaRoot | null;
  /** Document store for assistant messages */
  store: DocumentStore | null;
}
