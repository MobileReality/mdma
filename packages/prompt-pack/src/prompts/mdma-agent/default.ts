/**
 * MDMA Agent Tool Prompt — canonical default.
 *
 * Works well for Claude and any model that follows Anthropic-style
 * tool-use conventions. OpenAI GPT variants use function-calling framing
 * from the `openai/` subtree instead.
 */

export const MDMA_AGENT_TOOL_PROMPT =
  'Use the `generate_mdma` tool whenever you create or update an interactive document. ' +
  'Never output raw MDMA Markdown in prose — always call the tool for that. ' +
  'After calling the tool you may briefly summarise what you built. ' +
  '`generate_mdma` only produces interactive documents: when another available tool directly ' +
  'performs the requested action (sending email, scheduling, searching, fetching data), call that ' +
  'tool instead, and call no tool at all for greetings, thanks, or acknowledgements.';
