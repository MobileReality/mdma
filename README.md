# MDMA - Markdown Document with Micro-Applications

Interactive documents from Markdown. Built for high-stakes environments: healthcare, finance, critical ops.

## What is MDMA?

MDMA extends Markdown with interactive components defined in fenced `mdma` code blocks. A regular Markdown file becomes an interactive application:

````markdown
# Patient Intake

```mdma
type: form
id: intake-form
fields:
  - name: patient-name
    type: text
    label: "Full Name"
    required: true
    sensitive: true
  - name: email
    type: email
    label: "Email"
    required: true
    sensitive: true
  - name: reason
    type: textarea
    label: "Reason for Visit"
    required: true
```

```mdma
type: button
id: submit-btn
text: "Submit Intake Form"
variant: primary
onAction: submit
```
````

## Components

9 component types: **form**, **button**, **tasklist**, **table**, **chart**, **callout**, **approval-gate**, **webhook**, **thinking**

## Packages

| Package | Description |
|---------|-------------|
| `@mdma/spec` | Format specification, Zod schemas, TypeScript types |
| `@mdma/parser` | remark plugin: Markdown → MDMA AST |
| `@mdma/runtime` | Document store, event bus, audit log, policy engine, PII redaction |
| `@mdma/attachables-core` | Core component handlers |
| `@mdma/renderer-react` | React renderer with hooks |
| `@mdma/cli` | Developer CLI: lint, scaffold |
| `@mdma/prompt-pack` | AI system prompts for MDMA authoring |
| `@mdma/validator` | MDMA document validation |
| `@mdma/evals` | LLM evaluation suite (promptfoo) |

## Architecture

```
@mdma/spec                  Format specification + Zod schemas
  ├── @mdma/parser          Markdown → MDMA AST (remark plugin)
  ├── @mdma/prompt-pack     AI authoring prompts
  ├── @mdma/validator       Document validation
  └── @mdma/runtime         State / events / policy engine
        └── @mdma/attachables-core   Component handlers
              └── @mdma/renderer-react   React components
```

## Getting Started

```bash
pnpm install
pnpm build
pnpm test
```

## Evals

LLM evaluation suite using [promptfoo](https://www.promptfoo.dev/) to verify MDMA generation quality.

```bash
# Run base eval suite (25 tests)
pnpm eval

# Run custom system prompt tests (10 tests)
pnpm eval:custom

# Run multi-turn conversation tests (25 turns across 11 conversations)
pnpm eval:conversation

# Run all eval suites
pnpm eval:all

# View results in browser
pnpm eval:view
```

## Key Features

- **Deterministic parsing** — Markdown + YAML, no runtime JS in documents
- **PII protection** — Automatic detection + redaction (hash, mask, omit)
- **Audit trail** — Append-only event log with tamper-evident hash chaining
- **Policy engine** — Allow/deny rules per action and environment
- **AI authoring** — System prompts for AI-assisted document creation

## Tech Stack

TypeScript monorepo — pnpm workspaces, Turborepo, Zod, React, Vitest, remark

## License

MIT
