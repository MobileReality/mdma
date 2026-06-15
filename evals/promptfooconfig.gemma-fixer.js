// MDMA Fixer Prompt — Gemma 4 eval
//
// Gemma variant of promptfooconfig.fixer.js. The provider is pinned to Gemma 4
// (choose the size by comment/uncomment below); the fixer system prompt always
// resolves to the google/gemma-4 variant via the actual provider id. Outputs
// are scoped to gemma/.
//
// Run: pnpm --filter @mobile-reality/mdma-evals eval:gemma:fixer

// Gemma 4 via OpenRouter (uses OPENROUTER_API_KEY). Choose model size here:
const provider = 'openrouter:google/gemma-4-26b-a4b-it'; // 26B MoE (~4B active)
// const provider = 'openrouter:google/gemma-4-31b-it';

module.exports = {
  description: 'MDMA Fixer Prompt Eval — Gemma 4',
  envPath: '.env',
  outputPath: 'gemma/results-fixer.json',
  prompts: ['file://prompt-fixer.mjs'],
  providers: [
    {
      id: provider,
      config: {
        max_tokens: 8192,
        max_completion_tokens: 8192,
      },
    },
  ],
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
