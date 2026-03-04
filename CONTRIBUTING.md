# Contributing to MDMA

## Prerequisites

- **Node.js** 20+
- **pnpm** 10+ (`corepack enable`)
- **Git**

## Quick Start

```bash
git clone https://github.com/<your-user>/mr-mdma.git
cd mr-mdma
pnpm install
pnpm build
pnpm test
```

## Repository Structure

```
mr-mdma/
  packages/
    spec/                 # Zod schemas, TypeScript types
    parser/               # remark plugin: Markdown → MDMA AST
    runtime/              # State management, event bus, policy engine
    attachables-core/     # Component handlers (form, button, tasklist, …)
    renderer-react/       # React renderer
    prompt-pack/          # AI authoring prompts
    validator/            # MDMA document validation
  evals/                  # LLM evaluation suite (promptfoo)
  demo/                   # Demo application
  blueprints/             # Domain-specific MDMA documents
```

Managed with **pnpm workspaces** + **Turborepo**.

## Development Workflow

```bash
# Create a branch
git checkout -b feat/my-feature

# Build a single package
pnpm --filter @mdma/runtime build

# Run tests for a single package
pnpm --filter @mdma/runtime test

# Lint / typecheck / format
pnpm lint
pnpm typecheck
pnpm format
```

## Running Evals

LLM evaluation suite using [promptfoo](https://www.promptfoo.dev/):

```bash
# Base eval suite (25 tests)
pnpm eval

# Custom system prompt tests (10 tests)
pnpm eval:custom

# Multi-turn conversation tests (25 turns across 11 conversations)
pnpm eval:conversation

# All suites
pnpm eval:all

# View results in browser
pnpm eval:view
```

## Adding a New Component Type

### 1. Define the schema in `@mdma/spec`

Create `packages/spec/src/schemas/components/<name>.ts`:

```typescript
import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';

export const RatingComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('rating'),
  maxStars: z.number().int().positive().default(5),
  onRate: z.string().optional(),
});
```

Register it in `packages/spec/src/schemas/components/index.ts` (discriminated union, `COMPONENT_TYPES`, `componentSchemaRegistry`).

### 2. Create the handler in `@mdma/attachables-core`

Create `packages/attachables-core/src/<name>/<name>-handler.ts` and register it in `src/_shared/register-all.ts`.

### 3. Add a React renderer (optional)

Add a component in `packages/renderer-react/` if the component has UI.

### 4. Write tests

Add tests alongside your handler and schema. Run `pnpm test` to verify.

## Adding a Lint Rule

Lint rules live in `packages/cli/src/lint/rules/`:

```typescript
import type { MdmaRoot } from '@mdma/spec';
import type { LintDiagnostic } from '../lint-engine.js';

export function myRule(root: MdmaRoot): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  // Walk root.children, inspect nodes, push diagnostics
  return diagnostics;
}
```

Wire it into `packages/cli/src/lint/lint-engine.ts`.

## Creating a Blueprint

Blueprints live in `blueprints/<name>/` and contain:

| File | Purpose |
|------|---------|
| `package.json` | Workspace metadata |
| `manifest.yaml` | Blueprint metadata (name, version, maturity, domain) |
| `document.md` | The MDMA document |
| `demo-data/` | Sample JSON fixtures |

Use an existing blueprint as reference.

## Commit Conventions

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

**Scopes:** package names without `@mdma/` prefix — `spec`, `parser`, `runtime`, `attachables-core`, `renderer-react`, `cli`, `prompt-pack`, `validator`, `evals`

## Changesets

```bash
pnpm changeset
```

## Code Style

- **Prettier** for formatting (`pnpm format`)
- **ESLint** with `typescript-eslint`
- **TypeScript** strict mode, ESM-only
- Prefix unused parameters with `_`

## Code of Conduct

[Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Be welcoming and inclusive.

## Questions?

Open a [Discussion](https://github.com/mr-mdma/mr-mdma/discussions) or file an issue.
