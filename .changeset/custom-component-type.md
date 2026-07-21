---
"@mobile-reality/mdma-spec": minor
"@mobile-reality/mdma-parser": minor
"@mobile-reality/mdma-runtime": minor
"@mobile-reality/mdma-renderer-react": minor
"@mobile-reality/mdma-prompt-pack": minor
---

Add the `custom` component type — a host-extensible escape hatch for components the built-in types
do not cover. It is a stable envelope rather than a new type per component: `name` selects a variant
the host registered, `props` carries its inputs, and `actions` wires its events. This keeps the spec
intent-level while all rendering lives in the host, and — unlike the existing custom-*type* path — it
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
