/**
 * Promptfoo prompt function — agent guidance suite for our model.
 *
 * Agentic tool-calling probe: the model is given the `generate_mdma` tool (in
 * the provider config) and an NL request; it should CALL the tool for
 * document-creation requests and NOT call it for conversational ones
 * (asserted by calls-generate-mdma).
 *
 * ⚠️ Requires the endpoint to have function-calling enabled
 * (vLLM `--enable-auto-tool-choice` + `--tool-call-parser`). Without it the
 * endpoint returns HTTP 400 for `tool_choice: auto`. See
 * PHASE3-31B-SERVING-CONTEXT-TROUBLESHOOTING.md.
 */
const SYSTEM_PROMPT =
  'You are an assistant with a `generate_mdma` tool that produces interactive MDMA documents ' +
  '(forms, tables, charts, tasklists, callouts, approval-gates, buttons, webhooks). ' +
  'Call `generate_mdma` whenever the user asks you to create, build, design, or update an ' +
  'interactive document or UI. For greetings, questions about capabilities, explanations, or ' +
  'other conversational replies, respond normally and do NOT call the tool.';

export default function ({ vars }) {
  return [
    { role: 'system', content: `{% raw %}${SYSTEM_PROMPT}{% endraw %}` },
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
