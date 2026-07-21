# @mobile-reality/mdma-renderer-react

## 0.6.0

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
  - @mobile-reality/mdma-runtime@0.4.0

## 0.5.1

### Patch Changes

- 67f144a: Fix sensitive form field masking in the default form renderer. Sensitive fields now start masked and
  stay masked while typing (showing `•••`), instead of revealing the value as you type — the `👁`/`🔒`
  toggle reveals it on demand. Also fixed the accompanying styles: masked inputs switch to
  `type="password"`, which had no matching CSS rule and collapsed to an unstyled native box, and the
  reveal/mask toggle button now sits as an overlay inside the input rather than wrapping onto its own
  line below it.

## 0.5.0

### Minor Changes

- ae32824: Add opt-in theming to both renderers via a `theme` prop on `MdmaDocument`.

  - Pass `"light"`, `"dark"`, `"auto"` (follows the OS preference), or a full `MdmaTheme` token object; omit it for the unchanged default light look.
  - Web renderer: `styles.css` is now driven by `--mdma-*` CSS variables, so themes apply via `data-theme`/inline variables and can be overridden directly in CSS. Exposes `MdmaThemeProvider`, `useMdmaTheme`, `lightTheme`, `darkTheme`, and helpers.
  - Web renderer: a `MdmaDocument` with no `theme` prop now inherits the theme from an ancestor `MdmaThemeProvider`, so one provider can theme a whole app; an explicit `theme` prop still wins.
  - Web renderer: a custom `MdmaTheme` object now also selects the light/dark base (by its `background` luminance) so the stylesheet's internal derived colors (heading text, code backgrounds, …) match — a custom _dark_ theme no longer renders near-black text on a dark surface.
  - Web renderer: interactive states — button hover (`--mdma-color-*-hover`) and the input focus ring — now derive from the base tokens via `color-mix`, so a custom `primary` gets a coherent matching hover/focus automatically instead of the built-in purple.
  - React Native renderer: `theme="auto"` now follows the OS color scheme via `useColorScheme()`.
  - Both renderers share the same `MdmaTheme` token shape, so a custom theme object is portable between web and native.

## 0.4.1

### Patch Changes

- Updated dependencies [d55f0ab]
  - @mobile-reality/mdma-runtime@0.3.1
  - @mobile-reality/mdma-spec@0.3.1

## 0.4.0

### Minor Changes

- b03ad21: Support tasklist completion and webhook triggers as routable events. The tasklist renderer now
  emits `ACTION_TRIGGERED` (its `onComplete` action) on the transition into all-items-checked, and
  the webhook renderer gains a trigger button that emits `INTEGRATION_CALLED`. The `mdma-agui`
  bridge routes both back into the agent run — alongside form submit, button, and approve/deny — so
  completing a checklist or firing a webhook resumes the AG-UI conversation.

### Patch Changes

- Updated dependencies [b03ad21]
- Updated dependencies [d262328]
  - @mobile-reality/mdma-runtime@0.3.0

## 0.3.0

### Minor Changes

- 3220d14: Make the sensitive-field (PII) marker overridable. `FormRenderer` now resolves
  the 🔒 badge through the element-override system under the `sensitiveIndicator`
  key, so consumers can restyle it — or return `null` to opt a form scope out of
  the badge entirely — without CSS hacks. The default rendering is unchanged.

  Also exports `FormSensitiveIndicatorElementProps` (the new override's props) and
  `FormFileElementProps` (previously unexported).

## 0.2.4

### Patch Changes

- Updated dependencies [5bb8529]
  - @mobile-reality/mdma-spec@0.3.0
  - @mobile-reality/mdma-runtime@0.2.3

## 0.2.3

### Patch Changes

- d23b52c: Added AGENT_TOOL_PROMPT_VARIANTS registry with model-specific agent tool prompt variants for Anthropic, OpenAI, Google, and xAI models; changed sensitive input toggle to use 👁/🔒 icons

## 0.2.2

### Patch Changes

- d972139: Add npm keywords for discoverability
- Updated dependencies [d972139]
  - @mobile-reality/mdma-runtime@0.2.2
  - @mobile-reality/mdma-spec@0.2.2

## 0.2.1

### Patch Changes

- 9ba720a: Add `file` field type to forms. Forms can now declare file upload inputs, with a default file input UI in the renderer (overridable via `ElementOverridesContext`), schema defaults in the validator, and authoring guidance in the prompt pack.
- Updated dependencies [f6ae6c5]
- Updated dependencies [9ba720a]
  - @mobile-reality/mdma-runtime@0.2.1
  - @mobile-reality/mdma-spec@0.2.1

## 0.2.0

### Major Changes

- 4d37c6d: Added validator to the project

### Patch Changes

- Updated dependencies [4d37c6d]
  - @mobile-reality/mdma-runtime@1.0.0
