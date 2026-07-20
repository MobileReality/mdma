// MDMA Author Prompt — promptfoo evaluation config
//
// Run:  pnpm --filter @mobile-reality/mdma-evals eval
// View: pnpm --filter @mobile-reality/mdma-evals eval:view
//
// JS (not YAML) so the provider config can suppress reasoning-token leakage
// per model family — same pattern as promptfooconfig.fixer.js / .guidance.js /
// .conversation-flow.js.

const provider = process.env.EVAL_PROVIDER || 'openai:gpt-4.1-mini';

// Reasoning-flavoured models on OpenRouter prepend a visible "Thinking: ..."
// preamble to the response body. In the author suite that trace lands as prose
// before the first ```mdma block, tripping [yaml-correctness] / [duplicate-ids]
// on complex blueprints (e.g. grok-4.5's single tasklist-gates-button failure).
// This is a model-level behavior — prompt tuning does not fix it and extra
// framing regresses Grok. `passthrough.reasoning.exclude` strips the trace at
// the OpenRouter layer, which is how these models are run in production (the
// demo's usePreviewValidation does the same per-provider). Scoped to known
// leakers so non-reasoning models (OpenAI, etc.) are byte-identical to before.
const leaksReasoningTokens =
  (provider.includes('gemini') && provider.includes('pro')) ||
  provider.includes('gemini-3.5') ||
  provider.includes('grok-4.3') ||
  provider.includes('grok-4.5') ||
  provider.includes('fable');

const providerConfig = {
  // Lifted above the default 1024 so multi-component test cases (HR onboarding,
  // KYC review) don't truncate mid-component and trip component-count checks.
  // Both keys set so the cap applies whichever family the provider routes to;
  // promptfoo strips the one the model doesn't accept.
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
  description: 'MDMA Author Prompt Eval',
  envPath: '.env',
  outputPath: 'results.json',
  prompts: ['file://prompt.mjs'],
  providers: [{ id: provider, config: providerConfig }],
  defaultTest: {
    assert: [
      {
        type: 'javascript',
        value: 'file://assertions/validate-mdma.mjs',
        config: { exclude: ['flow-ordering', 'html-tags'] },
      },
    ],
  },
  tests: 'tests.yaml',
};
