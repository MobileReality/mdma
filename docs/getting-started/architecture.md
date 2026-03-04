# Architecture Overview

MDMA is a TypeScript monorepo managed with pnpm workspaces and Turborepo. It is organized into 8 packages and 5 blueprints.

## Package Dependency Graph

```
@mobile-reality/mdma-spec                    Zod schemas + TypeScript types (zero runtime deps beyond zod)
  |
  +-- @mobile-reality/mdma-parser            remark plugin: Markdown -> MdmaRoot AST
  |     |
  |     +-- (unified, remark-parse, vfile)
  |
  +-- @mobile-reality/mdma-prompt-pack       AI system prompts for authoring
  |
  +-- @mobile-reality/mdma-validator         Document validation (10 lint rules)
  |
  +-- @mobile-reality/mdma-runtime           Headless runtime: store, event bus, event log, policy engine,
        |                     redaction, PII detection, compliance reporter
        |
        +-- @mobile-reality/mdma-attachables-core    7 interactive component handlers
              |
              +-- @mobile-reality/mdma-renderer-react    React components + hooks

@mobile-reality/mdma-evals                   LLM evaluation suite (promptfoo)
```

All arrows point downward: each package depends only on packages above it. `@mobile-reality/mdma-spec` is the foundation with no internal dependencies.

## Packages

### @mobile-reality/mdma-spec

The specification package. Contains:

- **Zod schemas** for all 9 component types, event log entries, policies, bindings, document metadata, and blueprint manifests
- **TypeScript types** inferred from the schemas (`MdmaComponent`, `EventLogEntry`, `Policy`, etc.)
- **AST type definitions** (`MdmaBlock`, `MdmaRoot`)
- **Constants** (`MDMA_LANG_TAG = 'mdma'`, `MDMA_SPEC_VERSION = '0.1.0'`)
- **Component schema registry** mapping type names to their Zod schemas

Dependencies: `zod`

### @mobile-reality/mdma-parser

A remark plugin that transforms standard Markdown into an MDMA-extended AST. The pipeline:

1. `extractMdmaBlocks` -- walks the mdast tree, finds `code` nodes with `lang: 'mdma'`
2. `parseYaml` -- parses the YAML content
3. `validateComponent` -- validates against the component schema registry
4. `buildMdmaNode` -- replaces the code node with a typed `MdmaBlock`
5. `extractBindings` / `buildBindingGraph` -- builds a graph of all binding references

Dependencies: `@mobile-reality/mdma-spec`, `unified`, `remark-parse`, `vfile`

### @mobile-reality/mdma-runtime

Headless runtime with no UI dependencies. Provides:

- **DocumentStore** -- central state container. Manages bindings, component state, and subscriptions. Dispatches `StoreAction` events.
- **EventBus** -- typed pub/sub for `StoreAction` events with `on(type, handler)` and `onAny(handler)`
- **EventLog** -- append-only log of all events with component filtering
- **ChainedEventLog** -- hash-chained event log for tamper-evident audit trails
- **BindingResolver** -- resolves `{{path.to.value}}` expressions against state
- **PolicyEngine** -- evaluates and enforces rules per environment
- **Redactor** -- redacts sensitive values before logging
- **RedactionStrategies** -- `hash`, `mask`, `omit`
- **PII Detector** -- scans field names and values for email, phone, SSN, credit card, and name patterns
- **ComplianceReporter** -- generates compliance reports checking unique IDs, PII marking, approval gates, and interactive components
- **AttachableRegistry** -- registry for component handlers

Dependencies: `@mobile-reality/mdma-spec`

### @mobile-reality/mdma-attachables-core

Handlers for the 7 interactive component types (form, button, tasklist, table, callout, approval-gate, webhook). Each handler implements the `AttachableHandler` interface with `definition`, `initialize`, and `onAction` methods. The `registerAllCoreAttachables()` function registers all 7 handlers at once. Chart and thinking are display-only components that don't require state handlers.

Dependencies: `@mobile-reality/mdma-spec`, `@mobile-reality/mdma-runtime`

### @mobile-reality/mdma-renderer-react

React rendering layer. Provides:

- **MdmaProvider** / **useMdmaContext** -- React context wrapping the document store
- **MdmaDocument** / **MdmaBlock** -- top-level rendering components
- **Hooks**: `useDocumentStore()`, `useDocumentState()`, `useComponentState(id)`, `useBinding(expr)`
- **RendererRegistry** -- maps component types to React renderer components
- **Built-in renderers**: `FormRenderer`, `ButtonRenderer`, `TasklistRenderer`, `TableRenderer`, `CalloutRenderer`, `ApprovalGateRenderer`, `WebhookRenderer`, `ChartRenderer`, `ThinkingRenderer`

Dependencies: `@mobile-reality/mdma-spec`, `@mobile-reality/mdma-runtime`, `react`

### @mobile-reality/mdma-prompt-pack

AI system prompts for LLM-assisted MDMA authoring and review:

- `MDMA_AUTHOR_PROMPT` -- full format specification, all 9 component types, binding syntax, authoring rules, and self-check checklist
- `buildSystemPrompt({ customPrompt? })` -- combines the author prompt with an optional custom system prompt and a reinforcement reminder

Dependencies: none (pure string constants)

### @mobile-reality/mdma-validator

Static analysis engine for MDMA documents. Runs 10 validation rules:

- `yaml-correctness` -- valid YAML in all blocks
- `schema-conformance` -- Zod schema validation per component type
- `duplicate-ids` -- unique component IDs
- `id-format` -- kebab-case ID format
- `binding-syntax` -- correct `{{binding}}` syntax
- `binding-resolution` -- bindings reference existing component IDs
- `action-references` -- webhook triggers reference existing components
- `sensitive-flags` -- PII fields marked `sensitive: true`
- `required-markers` -- heuristic suggestions for `required: true`
- `thinking-block` -- thinking component placement

Dependencies: `@mobile-reality/mdma-spec`, `@mobile-reality/mdma-parser`

### @mobile-reality/mdma-evals

LLM evaluation suite using [promptfoo](https://www.promptfoo.dev/). Three test suites:

- **Base** (25 tests) -- single-turn MDMA generation quality
- **Custom prompt** (10 tests) -- exact blueprint generation from custom system prompts
- **Conversation** (11 conversations, 25 turns) -- multi-turn end-user interactions

Dependencies: `@mobile-reality/mdma-prompt-pack`, `@mobile-reality/mdma-validator`, `promptfoo`

## Blueprints

Blueprints are ready-to-use MDMA documents for specific domains. Each blueprint lives in `blueprints/<name>/` and contains:

```
blueprints/<name>/
  manifest.yaml       Blueprint metadata (name, maturity, components, integrations, checklists)
  document.md         The MDMA document
  README.md           Usage instructions
  demo-data/          Mock data for development
  package.json        Package metadata (private: true)
```

The manifest validates against `BlueprintManifestSchema` from `@mobile-reality/mdma-spec`.

### Available Blueprints

| Blueprint | Domain | Components |
|-----------|--------|------------|
| `incident-triage` | Critical Ops | form, tasklist, approval-gate, callout, button |
| `kyc-case` | Finance | form, tasklist, approval-gate, table |
| `clinical-ops` | Healthcare | form, approval-gate, tasklist, callout |
| `customer-escalation` | Support | form, tasklist, button, callout, table |
| `change-management` | Engineering | form, approval-gate, tasklist, callout |

## Build System

The monorepo uses:

- **pnpm workspaces** with `packages/*` and `blueprints/*` entries
- **Turborepo** for orchestrating `build`, `test`, `lint`, and `typecheck` tasks
- **TypeScript** 5.x with `ES2022` target, `ESNext` modules, `bundler` module resolution
- **Vitest** for testing
- **Changesets** for versioning and publishing

Build order is enforced by Turborepo's `dependsOn: ["^build"]` configuration, ensuring upstream packages are built before their dependents.
