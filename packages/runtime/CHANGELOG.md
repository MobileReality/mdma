# @mobile-reality/mdma-runtime

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

### Patch Changes

- Updated dependencies [cb3cf95]
  - @mobile-reality/mdma-spec@0.4.0

## 0.3.1

### Patch Changes

- d55f0ab: Add `main`, `module`, and `react-native` entry fields (and a `default` export condition) alongside the existing `exports` map. These packages previously exposed only an `exports` map, so bundlers that don't opt into package `exports` resolution — notably Metro/Snackager (Expo Snack) — couldn't find an entry point and failed with "Can't resolve ''". The added fields make the packages resolvable in any React Native / Metro bundler without enabling `unstable_enablePackageExports`. Fully additive and backwards-compatible.
- Updated dependencies [d55f0ab]
  - @mobile-reality/mdma-spec@0.3.1

## 0.3.0

### Minor Changes

- b03ad21: Add an `initialState` option to `createDocumentStore` for hydrating component values at store
  creation — e.g. restoring a persisted conversation fetched from a backend. Keyed by component id →
  its `values` map (symmetric with `getState()`), it overlays AST defaults **without emitting audit
  events or marking fields `touched`**, and applies only to freshly-created components so a streaming
  re-parse never clobbers in-flight edits. `mdma-agui` threads `initialState` through `parseMdma`,
  the bridge, and `MdmaAgentView`/`useMdmaAgentStream`, so re-opened conversations render
  pre-populated.

### Patch Changes

- d262328: Fix `DocumentStore.updateAst` freezing a component's `type` for the lifetime of its id. During
  streaming, an early partial parse can produce a placeholder/truncated type (e.g. `approval-gat`
  before `approval-gate` finishes streaming); `updateAst` now re-initializes a component when its
  type changes between parses, while still preserving in-flight state (values, touched) when the
  type is unchanged.

## 0.2.3

### Patch Changes

- Updated dependencies [5bb8529]
  - @mobile-reality/mdma-spec@0.3.0

## 0.2.2

### Patch Changes

- d972139: Add npm keywords for discoverability
- Updated dependencies [d972139]
  - @mobile-reality/mdma-spec@0.2.2

## 0.2.1

### Patch Changes

- f6ae6c5: Serialize File instances in FIELD_CHANGED payloads before audit-log append and redaction, so uploaded files keep { name, size, type, lastModified } in the trail instead of being JSON-flattened to {}. Exports a new serializeFiles helper for consumers (e.g. UI subscribers on eventBus) that need the same conversion.
- Updated dependencies [9ba720a]
  - @mobile-reality/mdma-spec@0.2.1

## 0.2.0

### Major Changes

- 4d37c6d: Added validator to the project
