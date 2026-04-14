---
name: mdma-integration
description: Integrate MDMA into an application and build features with it — wire up parsing, the runtime store, React rendering, LLM streaming, custom components, prompts, and CI validation. Use this skill when the user asks to add MDMA to an app, build a chat that streams MDMA, author or maintain a custom prompt, validate MDMA documents, register a custom component, or expose MDMA to an agent via MCP. Generates focused, correct wiring that uses the right packages for the job instead of reinventing them.
license: MIT
---

This skill guides integration of MDMA (Markdown Document with Mounted Applications) into real applications. MDMA is published as a set of composable npm packages under the `@mobile-reality` org — `mdma-spec`, `mdma-parser`, `mdma-runtime`, `mdma-renderer-react`, `mdma-attachables-core`, `mdma-prompt-pack`, `mdma-validator`, `mdma-cli`, `mdma-mcp`. A good integration picks the narrowest set of packages for the task, follows the parse → store → render contract, and uses the authoring and validation tooling rather than rolling its own. The goal is to make it obvious to a developer — or an agent — how to plug MDMA into their stack with minimum ceremony and maximum correctness.

The user provides an integration task: "add MDMA to this React chat app", "stream MDMA from the LLM and re-render as chunks arrive", "write a domain prompt for a clinical intake", "validate our MDMA docs in CI", "register a custom chart renderer", "expose MDMA to our agent via MCP", or "migrate our form rendering to MDMA". They may specify framework (React is first-class), LLM provider, validation rules, or PII constraints.

## Integration Thinking

Before editing code, establish what "integrate MDMA" actually means for this request:

- **Shape of the integration**: One of — *static document rendering* (ship pre-written MDMA, parse+render once), *LLM-streamed chat* (assistant streams MDMA, reparse as chunks arrive, preserve store state across reparses), *CI validation* (lint `*.md` files against the spec), *custom prompt authoring* (build a domain-specific `customPrompt` that feeds `buildSystemPrompt`), *MCP exposure* (let an agent call `get-spec` / `build-system-prompt` / `validate-prompt`), or *custom component* (register a Zod schema + renderer for a non-builtin type). Each has a different package footprint.
- **Package footprint**: Install only what the integration needs. A chat app needs `mdma-parser` + `mdma-runtime` + `mdma-renderer-react` + `mdma-prompt-pack`. A CI validator needs *only* `mdma-validator`. An agent harness may need *only* `mdma-mcp`. Don't install the full matrix "just in case" — the dependency graph is structured so you never have to.
- **Constraints**: Which components are in scope? Which fields must be `sensitive`? Which environment policies apply (allow/deny actions, redaction mode)? Which LLM provider is streaming? Does the host app already own state management, or will `createDocumentStore` be the source of truth for document state?
- **Where prompts live**: A domain prompt is a *maintained artifact*, not a one-off string. Decide where it lives (a `prompts/` directory, exported from a package, generated via the CLI prompt builder) and how it's versioned, before writing it.

**CRITICAL**: Integrate with the smallest valid surface area. Prefer the provided `MdmaDocument` + `createDocumentStore` pairing over hand-rolled rendering. Prefer `buildSystemPrompt({ customPrompt })` over concatenating strings yourself. Prefer the `validator` package over ad-hoc regex. The packages encode invariants (binding graph, PII redaction, audit log, policy) that are painful to re-derive.

## MDMA Integration Guidelines

Focus on:

- **Package selection & dependency chain**: The core chain is `spec → parser → runtime → attachables-core → renderer-react`. `prompt-pack`, `validator`, `cli`, `mcp` are leaves that depend only on `spec`. Install the minimum footprint for the task:

  ```bash
  # Parse + run MDMA documents (headless)
  npm install @mobile-reality/mdma-parser @mobile-reality/mdma-runtime

  # Add React rendering
  npm install @mobile-reality/mdma-renderer-react

  # LLM authoring — domain system prompts
  npm install @mobile-reality/mdma-prompt-pack

  # CI / static analysis
  npm install @mobile-reality/mdma-validator
  ```

  Never reinstall peers that are already pulled transitively.

- **Parse → Store → Render**: The contract is non-negotiable. Build a `unified().use(remarkParse).use(remarkMdma)` processor *once* (module-level singleton), feed it markdown, pass the AST to `createDocumentStore`, pass both to `<MdmaDocument>`:

  ```tsx
  import { unified } from 'unified';
  import remarkParse from 'remark-parse';
  import { remarkMdma } from '@mobile-reality/mdma-parser';
  import { createDocumentStore } from '@mobile-reality/mdma-runtime';
  import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
  import '@mobile-reality/mdma-renderer-react/styles.css';
  import type { MdmaRoot } from '@mobile-reality/mdma-spec';

  const processor = unified().use(remarkParse).use(remarkMdma); // singleton

  const tree = processor.parse(markdown);
  const ast = (await processor.run(tree)) as MdmaRoot;
  const store = createDocumentStore(ast, {
    documentId: 'my-doc',
    sessionId: crypto.randomUUID(),
  });

  return <MdmaDocument ast={ast} store={store} />;
  ```

- **LLM streaming**: The hard part of chat integrations is that the LLM emits MDMA token-by-token, but you can't re-`createDocumentStore` on every chunk (you'd wipe user state). The right pattern: throttle reparse (~150ms), and on each reparse call `existingStore.updateAst(newAst)` instead of building a fresh store. This preserves `bindings`, focus, and in-flight form edits across reparses.

  ```ts
  // On each ~150ms tick while streaming:
  const tree = processor.parse(message.content);
  const newAst = (await processor.run(tree)) as MdmaRoot;
  if (existingStore) {
    existingStore.updateAst(newAst); // preserves user state
  } else {
    existingStore = createDocumentStore(newAst, { documentId, sessionId });
  }
  ```

  Copy this shape; do not invent a replacement.

- **Prompts — build, don't concatenate**: Use `buildSystemPrompt({ customPrompt })` from `@mobile-reality/mdma-prompt-pack`. It sandwiches your domain rules between the MDMA spec and a reinforcement tail — the ordering matters for model adherence. Your `customPrompt` should *name the domain, allowed components, required fields, sensitive fields, trigger conditions, and business rules*. A vague "help the user" prompt produces generic forms; a prompt that encodes the domain produces documents that fit the product. When the prompt grows non-trivial, use the CLI prompt builder (`npx @mobile-reality/mdma-cli`) to generate it structurally, then commit the result as a maintained file.

  ```ts
  import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';

  const systemPrompt = buildSystemPrompt({
    customPrompt: `Domain: clinical intake.
  Allowed components: form, approval-gate, callout.
  All PII fields (name, email, phone, DOB, MRN) MUST be sensitive: true.
  Generate MDMA when the user describes a patient visit or symptom.`,
  });
  ```

- **Prompt maintenance rules**: Treat every custom prompt as code. Version it. Keep it in a file, not inline. Re-run the evals after changes. When updating, prefer adding a constraint to rewriting the prompt — additive changes preserve prior eval coverage. Name the file after the domain (e.g. `prompts/clinical-intake.ts`), not the author.

- **Validation**: In CI, call `validate(markdown, { autoFix: false })` from `@mobile-reality/mdma-validator` and fail the job on `!result.ok`. For local DX, wire `npx @mobile-reality/mdma-cli validate "docs/**/*.md" --fix`. Do not write custom YAML-regex linters — the validator already covers YAML correctness, schema conformance, ID uniqueness, binding resolution, and PII sensitivity.

  ```ts
  import { validate } from '@mobile-reality/mdma-validator';

  const result = await validate(markdown, { autoFix: false });
  if (!result.ok) {
    for (const issue of result.issues) console.error(issue);
    process.exit(1);
  }
  ```

- **Custom components**: To add a non-builtin component type, define a Zod schema, pass it to the parser via `customSchemas`, and register a React renderer via `customizations.components.<type>` on `MdmaDocument`. The same slot overrides built-ins (e.g. swap the default table-fallback chart for a recharts renderer).

  ```tsx
  import { z } from 'zod';
  import { ComponentBaseSchema } from '@mobile-reality/mdma-spec';

  const ProgressSchema = ComponentBaseSchema.extend({
    type: z.literal('progress'),
    value: z.number().min(0).max(100),
  });

  const processor = unified()
    .use(remarkParse)
    .use(remarkMdma, { customSchemas: new Map([['progress', ProgressSchema]]) });

  <MdmaDocument
    ast={ast}
    store={store}
    customizations={{
      components: {
        progress: ProgressRenderer,
        chart: MyRechartsRenderer, // overrides the built-in table fallback
      },
    }}
  />;
  ```

- **Actions & events**: Subscribe to the event bus via `store.getEventBus().onAny(handler)` to observe user actions without coupling to React state. Dispatch programmatically with `store.dispatch({ type: 'FIELD_CHANGED' | 'ACTION_TRIGGERED' | ... })`. Multi-step flows listen for `ACTION_TRIGGERED` and advance the conversation (e.g. inject the next assistant message when a button fires).

- **Agent integrations via MCP**: When an agent (Claude Desktop, Cursor, a custom harness) needs to produce MDMA, wire `@mobile-reality/mdma-mcp` instead of bundling prompts into the agent. Its tools — `get-spec`, `get-prompt`, `build-system-prompt`, `validate-prompt`, `list-packages` — collapse the discovery phase so the agent gets the spec, packages, and ready-made prompts in a handful of tool calls. The integration is three lines of JSON in the agent's MCP config:

  ```json
  {
    "mcpServers": {
      "mdma": { "command": "npx", "args": ["@mobile-reality/mdma-mcp"] }
    }
  }
  ```

- **Blueprints as starting points**: The upstream MDMA repository ships five production-shaped blueprints (change-management, clinical-ops, customer-escalation, incident-triage, kyc-case). When scaffolding a new domain, copy the nearest blueprint from the upstream repo and adapt — don't start from a blank file. They encode real component mixes, field choices, and flow shapes.

NEVER ship these integration anti-patterns:

- Re-creating `createDocumentStore(ast)` on every streamed chunk instead of calling `store.updateAst(ast)` — wipes user input mid-typing
- Rebuilding the `unified` processor on every render — it's expensive; make it a module-level singleton
- Concatenating system prompt strings by hand instead of calling `buildSystemPrompt` — breaks the spec + reinforcement sandwich the model relies on
- Writing regex-based validators instead of calling `validate()` — misses binding-graph and schema-conformance issues the package already catches
- Installing every `@mobile-reality/mdma-*` package when the integration only needs two or three
- Copy-pasting the MDMA spec into your system prompt instead of importing `MDMA_AUTHOR_PROMPT` / calling `buildSystemPrompt` — the spec evolves with the package
- Registering custom components only as renderers, without a matching Zod schema — the parser will reject the block or silently drop it
- Letting sensitive fields through unmarked because the prompt didn't require them — add `"All PII fields must be marked sensitive"` to every domain prompt by default
- Hardcoding a chart library into a fork of `renderer-react` — use `customizations.components.chart` instead
- Treating the generated prompt from `mdma-cli` as ephemeral — it's the domain spec; commit it

Interpret pragmatically and pick the shallowest integration that satisfies the requirement. A one-page demo that renders a static MDMA file needs three imports and ten lines. A production chat with streaming, custom components, and CI validation needs the full stack. Don't converge on a default kitchen-sink wiring across integrations.

**IMPORTANT**: Match integration depth to the app's vision. A static document viewer wants *parser + renderer-react* and nothing else — no store events, no prompt pack, no validator. A domain chat platform wants the full sequence: streaming reparse, domain `customPrompt` committed to the repo, custom components with Zod + renderer, CI validation, and MCP exposure for the agent author. Elegance comes from executing the chosen depth well, not from using every package in every app.

Remember: MDMA's whole point is that the packages already solve the hard parts — binding graphs, audit logs, PII redaction, policy, prompt assembly, validation. A good integration trusts them and composes them; a bad integration reinvents them. Compose, don't reinvent.
