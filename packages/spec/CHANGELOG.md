# @mobile-reality/mdma-spec

## 0.4.0

### Minor Changes

- cb3cf95: Add the `custom` component type — a host-extensible escape hatch for components the built-in types
  do not cover. It is a stable envelope rather than a new type per component: `name` selects a variant
  the host registered, `props` carries its inputs, and `actions` wires its events. This keeps the spec
  intent-level while all rendering lives in the host, and — unlike the existing custom-_type_ path — it
  is authorable by an LLM, because the envelope is part of the spec every prompt already teaches. A
  model cannot invent `type: timer`, but it can emit `type: custom` with `name: timer` once the variant
  appears in the catalog the host passes to `buildSystemPrompt({ customComponents })`.

  - **spec** — `CustomComponentSchema` (`id` required, `name` required, open `props` record, optional
    `actions` map), added to the component union, `COMPONENT_TYPES`, and the schema registry.
  - **parser** — per-`name` props validation: the envelope is validated by the union, then `props` are
    validated against the matching entry in `customSchemas`, with errors prefixed `props.*`. An
    unregistered `name` passes through rather than failing the parse, so a document authored against a
    richer host still renders elsewhere.
  - **runtime** — `registerCustomComponent()` registers a variant's handler and schema together.
  - **renderer-react** — `CustomVariantProvider` / `useCustomVariants()` and a `CustomRenderer` that
    falls back to an inline notice when a `name` has no registered variant, so an unknown variant
    degrades visibly instead of rendering nothing.
  - **prompt-pack** — `buildSystemPrompt({ customComponents })` renders an
    `## Available Custom Components` catalog; author, fixer, and agent prompts document the envelope
    and the standalone-not-a-form-field rule. Adds prompt variants for gpt-5.6 (sol/terra/luna),
    claude-opus-4.8, claude-fable-5, gemini-3.5-flash, and grok-4.5.

  The agent prompts also gain an other-tools clause so `generate_mdma` defers to a host's own tools
  when it is imported into an existing tool set, rather than answering requests those tools own.

  `@mobile-reality/mdma-renderer-react-native` does not yet render the `custom` type — documents using
  it fall back to the unknown-component path on React Native.

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
