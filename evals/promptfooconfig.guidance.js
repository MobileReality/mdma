// MDMA Agent Guidance Eval
//
// Tests whether the model correctly decides to call the `generate_mdma` tool
// when a user requests an interactive document — mirroring the Agent Chat flow.
//
// Run:  pnpm --filter @mobile-reality/mdma-evals eval:guidance
// View: pnpm --filter @mobile-reality/mdma-evals eval:view
//
// JS (not YAML) so the provider config can be tuned per model family — same
// pattern as `promptfooconfig.fixer.js`.

const provider = process.env.EVAL_PROVIDER || 'openai:gpt-4.1-mini';

/**
 * gpt-5.6 rejects `reasoning_effort` alongside function tools on
 * /v1/chat/completions:
 *
 *   400 — "Function tools with reasoning_effort are not supported for
 *   gpt-5.6-sol in /v1/chat/completions. To use function tools, use
 *   /v1/responses or set reasoning_effort to 'none'."
 *
 * promptfoo sends a reasoning_effort for the gpt-5 family by default, so this
 * suite (which is entirely tool-calling) errored on 15/15 cases for every
 * gpt-5.6 variant. Pinning `reasoning_effort: 'none'` is the documented remedy
 * and takes the suite to 15/15. The other option — routing to /v1/responses —
 * was tried and also 400s, because the Responses API expects a different tool
 * schema than the chat-completions shape below.
 *
 * Scoped to gpt-5.6 only: forcing 'none' globally would disable reasoning for
 * the other gpt-5.x models (changing what this suite measures) and is not
 * accepted by non-reasoning models like gpt-4.1.
 */
const needsReasoningEffortNone = provider.includes('gpt-5.6');

const providerConfig = {
  max_tokens: 8192,
  max_completion_tokens: 8192,
  // The generate_mdma tool — mirrors the definition in use-agent.ts
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
  description: 'MDMA Agent Guidance Eval',
  envPath: '.env',
  outputPath: 'results-guidance.json',
  prompts: ['file://prompt-guidance.mjs'],
  providers: [{ id: provider, config: providerConfig }],
  tests: 'tests-guidance.yaml',
};
