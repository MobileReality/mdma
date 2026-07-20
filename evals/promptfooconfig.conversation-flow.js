// MDMA Conversation Flow Judge — eval config
//
// Uses an LLM-as-judge prompt (MDMA_FIXER_CONVERSATION_JUDGE) to evaluate
// whether a multi-turn MDMA conversation correctly implements the flow
// defined in the test's customPrompt. The judge outputs a JSON
// `{ valid, issues[] }`; the assertion checks `valid` matches
// `vars.expectedJudgment`.
//
// Run:  pnpm --filter @mobile-reality/mdma-evals eval:conversation-flow
// View: pnpm --filter @mobile-reality/mdma-evals eval:view
//
// JS (not YAML) so the judge provider can suppress reasoning-token leakage —
// same pattern as `promptfooconfig.fixer.js`. The judge MUST return pure JSON;
// reasoning-flavoured models prepend a visible "Thinking: ..." preamble to the
// response body, which breaks `JSON.parse` in judge-matches-expected.mjs (seen
// with claude-fable-5: judge said `{"valid": true}` but emitted
// `Thinking: ...\n\n{"valid": true}`). `passthrough.reasoning.exclude` strips
// the trace at the OpenRouter layer so the judge output parses.

const provider = process.env.EVAL_PROVIDER || 'openai:gpt-4.1';

const leaksReasoningTokens =
  (provider.includes('gemini') && provider.includes('pro')) ||
  provider.includes('gemini-3.5') ||
  provider.includes('grok-4.3') ||
  provider.includes('grok-4.5') ||
  provider.includes('fable');

const providerConfig = {
  max_tokens: 4096,
  max_completion_tokens: 4096,
};

if (leaksReasoningTokens) {
  providerConfig.passthrough = {
    reasoning: { exclude: true },
    include_reasoning: false,
  };
}

module.exports = {
  description: 'MDMA Conversation Flow Judge Eval',
  envPath: '.env',
  outputPath: 'results-conversation-flow.json',
  prompts: ['file://prompt-conversation-judge.mjs'],
  providers: [{ id: provider, config: providerConfig }],
  defaultTest: {
    assert: [{ type: 'javascript', value: 'file://assertions/judge-matches-expected.mjs' }],
  },
  tests: 'tests-conversation-flow.yaml',
};
