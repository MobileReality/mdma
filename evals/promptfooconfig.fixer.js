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
  description: 'MDMA Fixer Prompt Eval',
  envPath: '.env',
  outputPath: 'results-fixer.json',
  prompts: ['file://prompt-fixer.mjs'],
  providers: [{ id: provider, config: providerConfig }],
  defaultTest: {
    assert: [
      { type: 'javascript', value: 'file://assertions/fixer-resolves-errors.mjs' },
      {
        type: 'javascript',
        value: 'file://assertions/fixer-preserves-components.mjs',
        config: { min: 1 },
      },
      { type: 'javascript', value: 'file://assertions/fixer-no-prose.mjs' },
    ],
  },
  tests: 'tests-fixer.yaml',
};
