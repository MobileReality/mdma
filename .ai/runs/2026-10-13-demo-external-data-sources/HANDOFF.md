# Handoff

Plan was unreviewed. Work done; awaiting review verdict.

## Decisions

- Toggle persisted as `externalDataSources` in the agent config (`mdma-agent-config` localStorage), default off.
- Catalog definitions carry their `resolve` fn; same array feeds prompt, validator `dataSourceCatalog` and `createDocumentStore`.
- Prompt builders and the DEMO_CUSTOM_COMPONENT_RULES moved byte-identical from use-agent.ts to agent-prompts.ts so tests can call them.
- parseMarkdown gets a third `storeOptions` arg; chat (#/chat) passes none.
- Fixer: validate with `dataSourceCatalog` + `buildFixerMessage({ dataSources })` when on; fixer system prompt unchanged.
- Own-model provider keeps its fixed prompt (no catalog in prompt); stores still get resolvers.
- demo/package.json gets a vitest devDependency and `test` script.

## Non-blocking findings

(none yet)
