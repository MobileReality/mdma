# @mobile-reality/mdma-validator

## 0.3.1

### Patch Changes

- Updated dependencies [d262328]
  - @mobile-reality/mdma-parser@0.2.4

## 0.3.0

### Minor Changes

- 5bb8529: Split validator into per-block validate() and multi-message validateConversation(); make form.onSubmit required and rewrite action-label fields as opaque labels (drop the action-references rule); add many model-specific fixer/author/agent-tool prompt variants (gpt-5.x family, Claude opus/sonnet/haiku, Gemini 2.5/3, Grok), promote the conversation-judge prompt out of mdma-fixer/ and rename its export to MDMA_CONVERSATION_JUDGE.

### Patch Changes

- Updated dependencies [5bb8529]
- Updated dependencies [019778a]
  - @mobile-reality/mdma-spec@0.3.0
  - @mobile-reality/mdma-parser@0.2.3

## 0.2.3

### Patch Changes

- d972139: Add npm keywords for discoverability
- Updated dependencies [d972139]
  - @mobile-reality/mdma-parser@0.2.2
  - @mobile-reality/mdma-spec@0.2.2

## 0.2.2

### Patch Changes

- 9ba720a: Add `file` field type to forms. Forms can now declare file upload inputs, with a default file input UI in the renderer (overridable via `ElementOverridesContext`), schema defaults in the validator, and authoring guidance in the prompt pack.
- Updated dependencies [9ba720a]
  - @mobile-reality/mdma-spec@0.2.1
  - @mobile-reality/mdma-parser@0.2.1

## 0.2.1

### Patch Changes

- Improved validator error messages and added new rules:

  - **Fuzzy type suggestions** — `schema-conformance` now suggests the closest match for unknown component types via Levenshtein distance and always lists valid types
  - **New `expected-components` rule** — verifies the LLM generated expected components with correct types, form fields, table columns, and action references (only checks components present in the message)
  - **Thinking block improvements** — detects duplicate thinking blocks, auto-fixes by merging multiples into one at the top; no longer warns when no thinking block is present
  - **Improved unfenced detection** — now requires both `type:` and nearby `id:` to flag bare MDMA YAML, reducing false positives on documentation text
  - **Better YAML parse error handling** — `binding-resolution` and `unreferenced-components` rules disabled by default (single-message-only checks that caused false positives in multi-turn flows)

## 0.2.0

### Major Changes

- 4d37c6d: Added validator to the project

### Patch Changes

- Updated dependencies [4d37c6d]
  - @mobile-reality/mdma-parser@1.0.0
