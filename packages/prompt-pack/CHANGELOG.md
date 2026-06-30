# @mobile-reality/mdma-prompt-pack

## 0.4.0

### Minor Changes

- 4a04d6f: Make the `mobile-reality/mdma-il` author variant DSL-aware. The MDMA-IL model
  reads an MDMA-IL DSL intent, so its system prompt must describe the DSL grammar;
  the previous variant had none. `getAuthorPromptVariant('mobile-reality/mdma-il')`
  now returns the full authoring prompt — DSL input grammar, authoring rules, and
  worked form/table/chart examples — as the single source of truth (previously
  duplicated in the eval harness). The registry label/description are unchanged.

## 0.3.2

### Patch Changes

- 5bb8529: Split validator into per-block validate() and multi-message validateConversation(); make form.onSubmit required and rewrite action-label fields as opaque labels (drop the action-references rule); add many model-specific fixer/author/agent-tool prompt variants (gpt-5.x family, Claude opus/sonnet/haiku, Gemini 2.5/3, Grok), promote the conversation-judge prompt out of mdma-fixer/ and rename its export to MDMA_CONVERSATION_JUDGE.
- Updated dependencies [5bb8529]
  - @mobile-reality/mdma-spec@0.3.0

## 0.3.1

### Patch Changes

- d23b52c: Added AGENT_TOOL_PROMPT_VARIANTS registry with model-specific agent tool prompt variants for Anthropic, OpenAI, Google, and xAI models; changed sensitive input toggle to use 👁/🔒 icons

## 0.3.0

### Minor Changes

- 4b595c8: Add model-specialised MDMA_AUTHOR prompt variants for OpenAI, Anthropic, Google, and xAI. New getAuthorPromptVariant(modelId) export for selecting the optimized prompt variant per model.

## 0.2.2

### Patch Changes

- d972139: Add npm keywords for discoverability
- Updated dependencies [d972139]
  - @mobile-reality/mdma-spec@0.2.2

## 0.2.1

### Patch Changes

- 9ba720a: Add `file` field type to forms. Forms can now declare file upload inputs, with a default file input UI in the renderer (overridable via `ElementOverridesContext`), schema defaults in the validator, and authoring guidance in the prompt pack.
- Updated dependencies [9ba720a]
  - @mobile-reality/mdma-spec@0.2.1

## 0.2.0

### Major Changes

- 4d37c6d: Added validator to the project
