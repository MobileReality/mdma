// MDMA Agent Guidance — Tool Coexistence eval config
//
// Integration-regression guard: a host product imports our agent system prompt
// and registers `generate_mdma` NEXT TO its own tools. Our prompt pushes fairly
// hard toward calling generate_mdma (<modify_followup>, <workflow_intent>), so
// this suite verifies it does NOT hijack requests that belong to the host's
// tools — and that generate_mdma still fires for genuine document requests.
//
// Run:  pnpm --filter @mobile-reality/mdma-evals eval:guidance-coexistence

const provider = process.env.EVAL_PROVIDER || 'openai:gpt-4.1-mini';

// gpt-5.6 rejects `reasoning_effort` alongside function tools (see guidance.js).
const needsReasoningEffortNone = provider.includes('gpt-5.6');

const fn = (name, description, properties, required) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
});

const providerConfig = {
  max_tokens: 8192,
  max_completion_tokens: 8192,
  tools: [
    fn(
      'generate_mdma',
      'Generate an MDMA Markdown document to present structured interactive content to the user. Use this to create forms, tables, checklists, approval gates, charts, callouts, and any other interactive UI components described in the MDMA spec.',
      { document: { type: 'string', description: 'The complete MDMA Markdown document.' } },
      ['document'],
    ),
    // --- a host application's own tools ---
    fn(
      'get_weather',
      'Get the current weather or forecast for a location.',
      {
        location: { type: 'string', description: 'City or place name.' },
        when: { type: 'string', description: 'e.g. "today", "tomorrow".' },
      },
      ['location'],
    ),
    fn(
      'search_web',
      'Search the web for current information, news, docs, or release notes.',
      { query: { type: 'string', description: 'The search query.' } },
      ['query'],
    ),
    fn(
      'send_email',
      'Send an email to one or more recipients.',
      {
        to: { type: 'string', description: 'Recipient address or name.' },
        subject: { type: 'string' },
        body: { type: 'string' },
      },
      ['to', 'body'],
    ),
    fn(
      'create_calendar_event',
      'Create a calendar event / schedule a meeting.',
      {
        title: { type: 'string' },
        start: { type: 'string', description: 'ISO datetime or natural language.' },
        attendees: { type: 'string' },
      },
      ['title', 'start'],
    ),
  ],
  tool_choice: 'auto',
};

if (needsReasoningEffortNone) {
  providerConfig.reasoning_effort = 'none';
}

module.exports = {
  description: 'MDMA Agent Guidance — Tool Coexistence Eval',
  envPath: '.env',
  outputPath: 'results-guidance-coexistence.json',
  prompts: ['file://prompt-guidance.mjs'],
  providers: [{ id: provider, config: providerConfig }],
  tests: 'tests-guidance-coexistence.yaml',
};
