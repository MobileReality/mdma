// MDMA Agent Guidance — Multi-Turn eval config
//
// Same tool-calling setup as promptfooconfig.guidance.js, but the prompt
// provider threads a prior conversationHistory before the current user turn,
// so this measures the tool-call decision IN CONTEXT (the "multi-turn" column
// of the agent matrix, which the single-turn guidance suite cannot measure).
//
// Run:  pnpm --filter @mobile-reality/mdma-evals eval:guidance-multiturn

const provider = process.env.EVAL_PROVIDER || 'openai:gpt-4.1-mini';

// gpt-5.6 rejects `reasoning_effort` alongside function tools on
// /v1/chat/completions — pin it to 'none' (see promptfooconfig.guidance.js).
const needsReasoningEffortNone = provider.includes('gpt-5.6');

const providerConfig = {
  max_tokens: 8192,
  max_completion_tokens: 8192,
  tools: [
    {
      type: 'function',
      function: {
        name: 'generate_mdma',
        description:
          'Generate an MDMA Markdown document to present structured interactive content to the user. Use this to create forms, tables, checklists, approval gates, charts, callouts, and any other interactive UI components described in the MDMA spec.',
        parameters: {
          type: 'object',
          properties: {
            document: {
              type: 'string',
              description: 'The complete MDMA Markdown document.',
            },
          },
          required: ['document'],
        },
      },
    },
  ],
  tool_choice: 'auto',
};

if (needsReasoningEffortNone) {
  providerConfig.reasoning_effort = 'none';
}

module.exports = {
  description: 'MDMA Agent Guidance — Multi-Turn Eval',
  envPath: '.env',
  outputPath: 'results-guidance-multiturn.json',
  prompts: ['file://prompt-guidance-multiturn.mjs'],
  providers: [{ id: provider, config: providerConfig }],
  tests: 'tests-guidance-multiturn.yaml',
};
