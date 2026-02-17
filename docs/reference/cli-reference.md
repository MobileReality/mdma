# CLI Reference

The `@mdma/cli` package provides the `mdma` command-line tool for validating and scaffolding MDMA documents.

## Installation

The CLI is available as a workspace package. After building the monorepo:

```bash
pnpm build
```

Run via `npx` from the project root:

```bash
npx mdma <command>
```

Or link it globally:

```bash
cd packages/cli
pnpm link --global
mdma --help
```

## Commands

### mdma lint

Validate one or more MDMA documents against all lint rules.

```
mdma lint <patterns...>
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `patterns` | One or more file patterns (glob-supported). `.md` extensions are expanded automatically. |

**Examples:**

```bash
# Lint a single file
mdma lint docs/incident-report.md

# Lint all Markdown files in a directory
mdma lint "blueprints/**/*.md"

# Lint multiple specific files
mdma lint document-a.md document-b.md

# Lint all blueprints
mdma lint "blueprints/*/document.md"
```

**Output:**

For each file with issues, the linter prints the file path followed by each diagnostic:

```
blueprints/incident-triage/document.md
  10:1  error  MDMA block failed schema validation  schema-valid
  25:1  error  Duplicate component ID: "form-1"  unique-ids

2 file(s) linted: 2 error(s), 0 warnings
```

Each diagnostic shows:

- `line:column` -- position in the source file (or `0:0` if unavailable)
- `error` or `warning` -- severity
- message -- description of the issue
- rule name -- which lint rule flagged it

**Exit code:**

- `0` -- no errors (warnings are allowed)
- `1` -- one or more errors found

### Lint Rules

The linter runs three rule passes on each document:

#### schema-valid

Checks that every `mdma` fenced code block successfully parsed into a typed component. If a block has invalid YAML or fails Zod schema validation, it remains as a raw `code` node in the AST and this rule flags it as an error.

**Severity:** error

**Common causes:**

- Invalid YAML syntax (bad indentation, missing colons)
- Missing required fields (`id`, `type`, or type-specific fields)
- Invalid field values (wrong enum value, negative number where positive is required)
- Unknown component type

#### unique-ids

Checks that all component `id` values are unique across the document.

**Severity:** error

**Example:**

```
  15:1  error  Duplicate component ID: "intake-form"  unique-ids
```

#### bindings-resolved

Checks that all `{{binding}}` expressions reference a known source. A binding is considered resolved if it matches a form field `name` in the document. Nested paths (containing dots) are skipped as they may resolve at runtime.

**Severity:** warning

**Example:**

```
  0:0  warning  Binding "{{unknown_field}}" in component "summary-table" may not resolve to any form field  bindings-resolved
```

---

### mdma scaffold

Generate a new attachable handler or blueprint from a template.

```
mdma scaffold <type> [name]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `type` | What to scaffold. Must be `"attachable"` or `"blueprint"`. |
| `name` | Optional name for the scaffolded item. Defaults to `my-attachable` or `my-blueprint`. |

**Examples:**

```bash
# Scaffold a new attachable handler
mdma scaffold attachable timer

# Scaffold with default name
mdma scaffold attachable
# Creates: ./my-attachable/

# Scaffold a new blueprint
mdma scaffold blueprint incident-response

# Scaffold with default name
mdma scaffold blueprint
# Creates: ./blueprints/my-blueprint/
```

#### Scaffolding an Attachable

Creates a directory in the current working directory with:

```
<name>/
  handler.ts       Attachable handler template
  package.json     Package config with @mdma/spec and @mdma/runtime deps
```

The generated `handler.ts`:

```typescript
import { z } from 'zod';
import { ComponentBaseSchema } from '@mdma/spec';
import type { AttachableHandler, ComponentState, AttachableContext } from '@mdma/runtime';

export const MyComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('my-component'),
  // Add your component-specific properties here
  title: z.string().min(1),
});

export type MyComponent = z.infer<typeof MyComponentSchema>;

export const myComponentHandler: AttachableHandler = {
  definition: {
    type: 'my-component',
    schema: MyComponentSchema,
    description: 'Description of your component',
    version: '0.1.0',
  },

  initialize(_ctx: AttachableContext, props: unknown): ComponentState {
    const parsed = MyComponentSchema.parse(props);
    return {
      id: parsed.id,
      type: 'my-component',
      values: {},
      errors: [],
      touched: false,
      visible: true,
      disabled: false,
    };
  },

  async onAction(ctx: AttachableContext, actionId: string, _payload: unknown) {
    ctx.dispatch({
      type: 'ACTION_TRIGGERED',
      componentId: ctx.componentId,
      actionId,
    });
  },
};
```

#### Scaffolding a Blueprint

Creates a directory under `blueprints/` with:

```
blueprints/<name>/
  manifest.yaml    Blueprint manifest template
  document.md      Starter MDMA document with form and tasklist
  README.md        Placeholder documentation
  demo-data/       Empty directory for mock data
  package.json     Private package config
```

The generated `manifest.yaml`:

```yaml
name: <name>
version: 0.1.0
maturity: experimental
description: Description of your blueprint
outcome: What the user gets from this blueprint
domain: your-domain
components_used:
  - form
  - tasklist
integrations: []
checklists:
  security: []
  logging: []
  schema: []
  mocks: []
  docs: []
```

The generated `document.md`:

````markdown
# My Blueprint

## Overview

Describe the purpose of this blueprint.

```mdma
id: main-form
type: form
fields:
  - name: title
    type: text
    label: Title
    required: true
onSubmit: submit-form
```

## Checklist

```mdma
id: tasks
type: tasklist
items:
  - id: step-1
    text: Complete step 1
  - id: step-2
    text: Complete step 2
```
````

**Error handling:**

- If the target directory already exists, the command prints an error and exits without overwriting.
- If `type` is not `"attachable"` or `"blueprint"`, the command prints an error and exits with code 1.

---

## Global Options

```
mdma --version    Print the CLI version
mdma --help       Show help text
mdma <cmd> --help Show help for a specific command
```
