# Contributing to MDMA

Thank you for your interest in contributing to MDMA (Markdown Document Markup Architecture). This guide covers everything you need to get started.

## Prerequisites

- **Node.js** 20 or later
- **pnpm** 10 or later (`corepack enable` to activate the version pinned in `package.json`)
- **Git**

## Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/<your-user>/mr-mdma.git
cd mr-mdma

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm build

# 4. Run tests
pnpm test
```

## Repository Structure

```
mr-mdma/
  packages/
    spec/                 # Zod schemas, TypeScript types, format constants
    parser/               # remark plugin: Markdown -> MDMA AST
    runtime/              # Headless state management, event bus, policy engine
    attachables-core/     # Built-in component handlers (form, button, tasklist, ...)
    renderer-react/       # React renderer for MDMA documents
    cli/                  # Developer CLI (lint, scaffold, preview, build)
    prompt-pack/          # AI authoring prompts + self-check validators
  blueprints/
    incident-triage/      # Production incident workflow
    kyc-case/             # KYC/AML verification
    clinical-ops/         # Clinical procedure approval
    customer-escalation/  # SLA-driven escalation
    change-management/    # Release approval (SOX/ISO)
```

Packages are managed with **pnpm workspaces** and built with **Turborepo**. The dependency graph flows top-down:

```
@mdma/spec -> @mdma/parser -> @mdma/runtime -> @mdma/attachables-core -> @mdma/renderer-react -> @mdma/cli
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feat/my-feature   # or fix/issue-42, docs/update-readme, etc.
```

### 2. Make Changes

All packages use TypeScript with ESM. Source lives in `src/`, compiled output goes to `dist/`.

```bash
# Build a single package (with dependencies)
pnpm --filter @mdma/runtime build

# Run tests for a single package
pnpm --filter @mdma/runtime test

# Lint everything
pnpm lint

# Type-check everything
pnpm typecheck

# Format code
pnpm format
```

### 3. Open a Pull Request

- Push your branch and open a PR against `main`.
- Fill in the PR template.
- Make sure CI passes (build, test, lint, typecheck).

## How to Add a New Component Type

Components are the interactive blocks inside `\`\`\`mdma` fenced code. To add a new one (e.g., `rating`):

### Step 1 -- Define the Schema in `@mdma/spec`

Create `packages/spec/src/schemas/components/rating.ts`:

```typescript
import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';

export const RatingComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('rating'),
  maxStars: z.number().int().positive().default(5),
  onRate: z.string().optional().describe('Action ID triggered on rating'),
});

export type RatingComponent = z.infer<typeof RatingComponentSchema>;
```

Then register it in `packages/spec/src/schemas/components/index.ts`:

- Add it to the `MdmaComponentSchema` discriminated union.
- Add it to `COMPONENT_TYPES`.
- Add it to `componentSchemaRegistry`.
- Re-export the schema and type.

### Step 2 -- Create the Handler in `@mdma/attachables-core`

Create `packages/attachables-core/src/rating/rating-handler.ts`:

```typescript
import { RatingComponentSchema } from '@mdma/spec';
import type { AttachableHandler, ComponentState, AttachableContext } from '@mdma/runtime';

export const ratingHandler: AttachableHandler = {
  definition: {
    type: 'rating',
    schema: RatingComponentSchema,
    description: 'Star rating input',
    version: '0.1.0',
  },

  initialize(_ctx: AttachableContext, props: unknown): ComponentState {
    const rating = RatingComponentSchema.parse(props);
    return {
      id: rating.id,
      type: 'rating',
      values: { stars: 0 },
      errors: [],
      touched: false,
      visible: true,
      disabled: false,
    };
  },

  async onAction(ctx: AttachableContext, actionId: string) {
    ctx.dispatch({
      type: 'ACTION_TRIGGERED',
      componentId: ctx.componentId,
      actionId,
    });
  },
};
```

Register it in `packages/attachables-core/src/_shared/register-all.ts`.

### Step 3 -- Add a React Renderer (optional)

If the component has a UI, add a React component in `packages/renderer-react/`.

### Step 4 -- Write Tests

Add tests alongside your handler and schema. Run `pnpm test` to verify.

## How to Add a New Lint Rule

Lint rules live in `packages/cli/src/lint/rules/`. Each rule is a function with this signature:

```typescript
import type { MdmaRoot } from '@mdma/spec';
import type { LintDiagnostic } from '../lint-engine.js';

export function myRule(root: MdmaRoot): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  // Walk root.children, inspect nodes, push diagnostics
  return diagnostics;
}
```

Then wire it into `packages/cli/src/lint/lint-engine.ts` by importing and calling it alongside the existing rules (`schemaValid`, `uniqueIds`, `bindingsResolved`).

## How to Create a Blueprint

Blueprints are complete, domain-specific MDMA documents. Each blueprint lives in `blueprints/<name>/` and contains:

| File | Purpose |
|------|---------|
| `package.json` | Workspace metadata (`@mr-mdma/blueprint-<name>`) |
| `manifest.yaml` | Blueprint metadata validated against `BlueprintManifestSchema` |
| `document.md` | The MDMA document with `\`\`\`mdma` blocks |
| `README.md` | Usage guide, component list, integration points |
| `demo-data/` | Sample JSON fixtures for testing |

The `manifest.yaml` must specify: `name`, `version`, `maturity` (`experimental` | `stable` | `enterprise-ready`), `description`, `outcome`, `domain`, and `components_used`.

Use an existing blueprint (e.g., `blueprints/incident-triage/`) as a reference.

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

**Scopes:** package names without the `@mdma/` prefix -- `spec`, `parser`, `runtime`, `attachables-core`, `renderer-react`, `cli`, `prompt-pack`, or a blueprint name.

Examples:

```
feat(spec): add rating component schema
fix(runtime): prevent duplicate event dispatch
docs(cli): document --fix flag for lint command
test(attachables-core): add form validation edge cases
```

## Changesets

We use [Changesets](https://github.com/changesets/changesets) for versioning. If your change affects published packages, run:

```bash
pnpm changeset
```

Follow the prompts to describe the change and select the affected packages.

## Code Style

- **Formatter:** Prettier (run `pnpm format` before committing)
- **Linter:** ESLint with `typescript-eslint`
- **TypeScript:** Strict mode, ESM-only (`"type": "module"`)
- Prefix unused parameters with `_` (e.g., `_ctx`)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold a welcoming, inclusive environment. Report unacceptable behavior to the project maintainers.

## Questions?

Open a [Discussion](https://github.com/mr-mdma/mr-mdma/discussions) or file an issue. We are happy to help.
