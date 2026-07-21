// MDMA Conversation Tests — promptfoo evaluation config
//
// Multi-turn tests that verify MDMA documents survive follow-up user
// interactions without re-generation, YAML leaks, or field loss.
//
// Run:  pnpm --filter @mobile-reality/mdma-evals eval:conversation
// View: pnpm --filter @mobile-reality/mdma-evals eval:view
//
// JS (not YAML) so the author provider can suppress reasoning-token leakage —
// same pattern as promptfooconfig.js / .conversation-flow.js. Reasoning models
// (e.g. gemini-3.5-flash) otherwise emit a visible "Thinking: ..." preamble as
// prose instead of the requested component, dropping form fields / sensitive
// flags. `passthrough.reasoning.exclude` strips the trace at the OpenRouter
// layer. Scoped to known leakers so non-reasoning models are unaffected.

const provider = process.env.EVAL_PROVIDER || 'openai:gpt-4.1-mini';

const leaksReasoningTokens =
  (provider.includes('gemini') && provider.includes('pro')) ||
  provider.includes('gemini-3.5') ||
  provider.includes('grok-4.3') ||
  provider.includes('grok-4.5') ||
  provider.includes('fable');

const providerConfig = {
  max_tokens: 8192,
  max_completion_tokens: 8192,
};

if (leaksReasoningTokens) {
  providerConfig.passthrough = {
    reasoning: { exclude: true },
    include_reasoning: false,
  };
}

module.exports = {
  description: 'MDMA Conversation (Multi-Turn) Eval',
  envPath: '.env',
  outputPath: 'results-conversation.json',
  prompts: ['file://prompt-conversation.mjs'],
  providers: [{ id: provider, config: providerConfig }],
  tests: 'tests-conversation.yaml',
};
