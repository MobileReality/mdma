# Third-party artifacts vendored for the benchmark

This directory redistributes files from other open-source projects so the benchmark stays
reproducible against a fixed upstream state. Each file is **unmodified** from the pinned commit
listed below. Their licenses and copyright notices are reproduced in `licenses/`.

Nothing here is ours. It is included under the terms of the licenses below, for the sole purpose
of running each format against the prompt and schema its own authors publish — rather than
against something we wrote for them.

## thesysdev/openui — MIT

Copyright (c) 2011-2024 Thesys Inc. Full text: [`licenses/openui-LICENSE.txt`](licenses/openui-LICENSE.txt)

Pinned commit: `65b5f9354e6ea969c2dc52a404a5254a99e89b77`

| File | Upstream path | Modified |
| --- | --- | --- |
| `openui-system-prompt.txt` | `benchmarks/system-prompt.txt` | no |
| `openui-schema.json` | `benchmarks/schema.json` | no |

Both are generated upstream by `openuiLibrary.prompt()` and `openuiLibrary.toJSONSchema()` from
`@openuidev/react-ui`, and are the same artifacts their own token benchmark uses.

## AGenUI/AGenUI — Apache License 2.0

Full text: [`licenses/agenui-LICENSE.txt`](licenses/agenui-LICENSE.txt)

Pinned commit: `3e79beaa21e298ea6987eaf8a71c90139c0b0b2b`

| File | Upstream path | Modified |
| --- | --- | --- |
| `a2ui-SKILL.md` | `skills/a2ui-generation/SKILL.md` | no |
| `a2ui-reference.md` | `skills/a2ui-generation/reference.md` | no |
| `a2ui-reference/*.md` | `skills/a2ui-generation/reference/*.md` | no |
| `agenui_catalog.json` | `agenui_catalog.json` | no |

**Statement of changes (Apache-2.0 §4b):** the vendored files themselves are byte-identical to
upstream. The benchmark concatenates `a2ui-SKILL.md` with three of the reference documents at
runtime (see `src/adapters/a2ui.ts`) and appends a short note telling the model it is being
called through a plain chat completion and cannot read files. That composition happens in our
code at runtime — it does not alter any file in this directory. It is necessary because A2UI
ships an Agent Skill with progressive disclosure rather than a self-contained system prompt.

## vercel-labs/json-render — Apache License 2.0

No files from this project are vendored. Its prompt and validators are consumed at runtime from
the published npm packages `@json-render/core`, `@json-render/react` and `@json-render/shadcn`,
pinned to `0.19.0`. The commit SHA in `PINS.txt` records the upstream state at the time of the
run for reference only.

## CopilotKit/OpenGenerativeUI — MIT

No files vendored and not run. It is discussed qualitatively in the report only, because it
emits un-schema'd HTML/CSS/JS with no validator to score against.
