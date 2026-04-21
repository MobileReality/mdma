# @mobile-reality/mdma-validator

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
