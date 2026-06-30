---
"@mobile-reality/mdma-prompt-pack": minor
---

Make the `mobile-reality/mdma-il` author variant DSL-aware. The MDMA-IL model
reads an MDMA-IL DSL intent, so its system prompt must describe the DSL grammar;
the previous variant had none. `getAuthorPromptVariant('mobile-reality/mdma-il')`
now returns the full authoring prompt — DSL input grammar, authoring rules, and
worked form/table/chart examples — as the single source of truth (previously
duplicated in the eval harness). The registry label/description are unchanged.
