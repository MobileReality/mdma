# @mobile-reality/mdma-spec

## 0.3.1

### Patch Changes

- d55f0ab: Add `main`, `module`, and `react-native` entry fields (and a `default` export condition) alongside the existing `exports` map. These packages previously exposed only an `exports` map, so bundlers that don't opt into package `exports` resolution — notably Metro/Snackager (Expo Snack) — couldn't find an entry point and failed with "Can't resolve ''". The added fields make the packages resolvable in any React Native / Metro bundler without enabling `unstable_enablePackageExports`. Fully additive and backwards-compatible.

## 0.3.0

### Minor Changes

- 5bb8529: Split validator into per-block validate() and multi-message validateConversation(); make form.onSubmit required and rewrite action-label fields as opaque labels (drop the action-references rule); add many model-specific fixer/author/agent-tool prompt variants (gpt-5.x family, Claude opus/sonnet/haiku, Gemini 2.5/3, Grok), promote the conversation-judge prompt out of mdma-fixer/ and rename its export to MDMA_CONVERSATION_JUDGE.

## 0.2.2

### Patch Changes

- d972139: Add npm keywords for discoverability

## 0.2.1

### Patch Changes

- 9ba720a: Add `file` field type to forms. Forms can now declare file upload inputs, with a default file input UI in the renderer (overridable via `ElementOverridesContext`), schema defaults in the validator, and authoring guidance in the prompt pack.
