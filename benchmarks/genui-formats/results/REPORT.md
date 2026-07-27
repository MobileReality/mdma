# Generative-UI format reliability benchmark

_Generated 2026-07-27T13:09:51.685Z · 1107 generations · 0 API errors_

Four open-source generative-UI formats, each generated natively from its own published
prompt and validated by its own validator, across a ladder of models.

**The question:** given a system prompt you can paste into any LLM, does the model emit
output you can actually render — every time, including on weak models?

**Formats tested:** MDMA · OpenUI Lang · json-render · A2UI (AGenUI)

**Models tested:**

| Rung | Model | Provider id | Generations |
| --- | --- | --- | --- |
| flagship | Opus 5 | `anthropic/claude-opus-5` | 360 |
| mid | GPT-5.6-terra | `openai/gpt-5.6-terra` | 360 |
| small | Gemma-4-26B-A4B | `google/gemma-4-26b-a4b-it` | 360 |

All reached through OpenRouter, 5 repeats per scenario, temperature 0.7, max_tokens 8192 —
identical settings for every format and model.

## Reading the tables

Every metric below is marked **↑ higher is better** or **↓ lower is better**.

| Metric | Direction | What it means | Best possible |
| --- | --- | --- | --- |
| Renderable rate | **↑ higher** | share of generations a renderer could render | 100% |
| Truncation rate | **↓ lower** | share of generations that hit the 8k output ceiling — the format didn't fit | 0% |
| "Every time" rate | **↑ higher** | share of scenarios where all 5 repeats rendered cleanly | 100% |
| Shape stability | **↑ higher** | share of scenarios whose repeats produced identical structure (within-format only) | 100% |
| Output tokens | **↓ lower** | mean completion tokens — drives cost and time-to-render | fewer |
| Prompt tokens | **↓ lower** | system-prompt size, paid on every single request | fewer |
| Efficiency | **↑ higher** | renderable output per 1k output tokens | higher |
| Failure counts | **↓ lower** | number of generations in each failure category | 0 |

> Renderable rate and truncation rate are **not** two views of the same thing. Truncated
> generations are removed from the renderable denominator entirely, so a format can show
> 100% renderable and 52% truncated at once — meaning "everything that fit was valid, but
> half of it did not fit".

## What was run

|  | Value |
| --- | --- |
| Scenarios | 18 (6 families x 3 variants) |
| Formats | 4 |
| Models | 3 |
| Repeats per scenario | 5 |
| Total generations | 1107 |
| Temperature | 0.7, identical for every format and model |
| Max tokens | 8192, identical |

### System prompts

Each format uses its own published prompt, unmodified, obtained through its own official
artifact or prompt-generation API.

| Format | Source | Prompt tokens (↓ lower is better) |
| --- | --- | --- |
| MDMA | buildSystemPrompt() + per-model author variant (packages/prompt-pack) | 5910 |
| OpenUI Lang | vendor/openui-system-prompt.txt (thesysdev/openui @ 65b5f93) | 5172 |
| json-render | catalog.prompt() — @json-render/core 0.19.0, shadcn catalog + Chart | 8466 |
| A2UI (AGenUI) | flattened skills/a2ui-generation SKILL.md + required refs (AGenUI @ 3e79bea) | 19689 |

## 1. Renderable rate — ↑ higher is better

Share of generations that parse and validate — i.e. that a renderer could render.

| Model | MDMA | OpenUI Lang | json-render | A2UI (AGenUI) |
| --- | --- | --- | --- | --- |
| **flagship** |  |  |  |  |
| Opus 5 | 100.0% | 98.8% | 100.0% | 100.0% |
| **mid** |  |  |  |  |
| GPT-5.6-terra | 91.1% | 100.0% | 93.3% | 81.1% |
| **small** |  |  |  |  |
| Gemma-4-26B-A4B | 98.9% | 83.3% | 83.3% | 93.3% |

### Truncation — ↓ lower is better (output that exceeded the shared 8192-token ceiling)

Truncated generations are **excluded from the renderable rate above** and reported here
instead. A response cut off mid-structure tells us the format is verbose, not that the model
cannot produce it — charging it as a format failure would penalise verbose formats for our
budget choice rather than for anything about their reliability.

It is still a real cost. Truncation here means: at 8k output tokens, that format did not fit.

| Model | MDMA | OpenUI Lang | json-render | A2UI (AGenUI) |
| --- | --- | --- | --- | --- |
| **flagship** |  |  |  |  |
| Opus 5 | 4.4% | 8.9% | 12.2% | 52.2% |
| **mid** |  |  |  |  |
| GPT-5.6-terra | 0.0% | 0.0% | 0.0% | 0.0% |
| **small** |  |  |  |  |
| Gemma-4-26B-A4B | 0.0% | 0.0% | 0.0% | 0.0% |

## 2. "Every time" rate — ↑ higher is better

Share of scenarios where **all 5 repeats** rendered. This is the number that matters if
you are shipping a product: a format that works 4 times in 5 still breaks in production.

| Model | MDMA | OpenUI Lang | json-render | A2UI (AGenUI) |
| --- | --- | --- | --- | --- |
| **flagship** |  |  |  |  |
| Opus 5 | 94.4% | 83.3% | 83.3% | 38.9% |
| **mid** |  |  |  |  |
| GPT-5.6-terra | 83.3% | 100.0% | 72.2% | 72.2% |
| **small** |  |  |  |  |
| Gemma-4-26B-A4B | 94.4% | 55.6% | 38.9% | 77.8% |

## 3. Shape stability — ↑ higher is better (diagnostic only — NOT comparable across formats)

Share of scenarios where all 5 repeats produced the same component structure.

> **Read down a column, never across a row.** The structural fingerprint has different
> granularity in each format, so cross-format comparison here is meaningless. An MDMA
> document's shape is one or two component types (`form`); a json-render spec's is eight to
> sixteen nested elements including every `Stack` and `Card` wrapper. A coarser fingerprint is
> trivially more stable. This is the layout-primitive asymmetry that the scored corpus
> excludes, reappearing as a measurement artifact.
>
> It is still useful *within* a format — it shows how much a given format wobbles as models
> get weaker — which is why it is kept rather than deleted.

| Model | MDMA | OpenUI Lang | json-render | A2UI (AGenUI) |
| --- | --- | --- | --- | --- |
| **flagship** |  |  |  |  |
| Opus 5 | 16.7% | 5.6% | 5.6% | 5.6% |
| **mid** |  |  |  |  |
| GPT-5.6-terra | 72.2% | 5.6% | 5.6% | 5.6% |
| **small** |  |  |  |  |
| Gemma-4-26B-A4B | 72.2% | 5.6% | 0.0% | 5.6% |

## 4. Output tokens (↓ lower is better) and efficiency (↑ higher is better)

Efficiency is `renderable rate / avg output tokens x 1000` — renderable output per 1k tokens.
Cheap output nobody can render is not cheap.

**Mean output tokens — ↓ lower is better:**

| Model | MDMA | OpenUI Lang | json-render | A2UI (AGenUI) |
| --- | --- | --- | --- | --- |
| **flagship** |  |  |  |  |
| Opus 5 | 1666 | 1814 | 4019 | 7209 |
| **mid** |  |  |  |  |
| GPT-5.6-terra | 554 | 567 | 1020 | 1674 |
| **small** |  |  |  |  |
| Gemma-4-26B-A4B | 448 | 417 | 836 | 1485 |

**Efficiency — ↑ higher is better (renderable output per 1k output tokens):**

| Model | MDMA | OpenUI Lang | json-render | A2UI (AGenUI) |
| --- | --- | --- | --- | --- |
| **flagship** |  |  |  |  |
| Opus 5 | 0.60 | 0.54 | 0.25 | 0.14 |
| **mid** |  |  |  |  |
| GPT-5.6-terra | 1.64 | 1.77 | 0.91 | 0.48 |
| **small** |  |  |  |  |
| Gemma-4-26B-A4B | 2.21 | 2.00 | 1.00 | 0.63 |

## 5. Failure taxonomy — ↓ lower is better (0 is perfect)

| Format | broken-reference | no-structured-output | off-task | parse-error | prose-leakage | schema-error | truncated | unknown-component |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MDMA | 0 | 6 | 2 | 1 | 0 | 0 | 4 | 0 |
| OpenUI Lang | 142 | 0 | 0 | 0 | 0 | 57 | 8 | 1 |
| json-render | 27 | 0 | 0 | 0 | 0 | 26 | 11 | 0 |
| A2UI (AGenUI) | 3 | 13 | 7 | 0 | 2 | 0 | 47 | 0 |

## 6. Renderable rate by scenario family — ↑ higher is better

| Family | MDMA | OpenUI Lang | json-render | A2UI (AGenUI) |
| --- | --- | --- | --- | --- |
| contact-form | 100.0% | 100.0% | 93.3% | 77.8% |
| data-table | 82.2% | 86.7% | 82.2% | 66.7% |
| chart | 97.8% | 93.3% | 95.6% | 80.0% |
| callout | 100.0% | 91.1% | 95.6% | 93.3% |
| button | 100.0% | 97.8% | 88.9% | 88.9% |
| tasklist | 91.1% | 77.8% | 73.3% | 37.8% |

**By variant** — the adversarial variant is where formats separate:

| Variant | MDMA | OpenUI Lang | json-render | A2UI (AGenUI) |
| --- | --- | --- | --- | --- |
| minimal | 100.0% | 93.3% | 95.6% | 87.8% |
| realistic | 98.9% | 97.8% | 90.0% | 71.1% |
| adversarial | 86.7% | 82.2% | 78.9% | 63.3% |

## Method and fairness

- Every format uses **its own published prompt, unmodified**, from its own official artifact
  or prompt-generation API. None of the prompts were written by us.
- Every format is validated by **its own validator** — MDMA by `@mobile-reality/mdma-validator`,
  json-render by `validateSpec()` + `catalog.validate()`, OpenUI by `createParser()` from
  `@openuidev/lang-core`, A2UI against the shipped `agenui_catalog.json`.
- **Auto-repair is off for every format.** The question is whether the model produced
  renderable output, not whether a repair layer can rescue it. MDMA ships an autofix and it
  is disabled here; enabling it would flatter MDMA against formats with no equivalent.
- One standard for what counts as a failure, applied to all four: **fatal** means the renderer
  produces something broken, blank or missing; **degraded** (a dropped surplus prop, a code
  fence around otherwise-valid payload) is recorded but not counted against the format.
- Identical user prompts, temperature, and token limits across every format and model.
- Each call is exactly two messages. The **system message** is that format's own published
  prompt, which of course describes its output format in full — component signatures, syntax
  rules, worked examples. That is the thing under test. The **user message** is the scenario
  text, byte-identical across all four formats and written in plain natural language with
  **no format hints**: no YAML, no JSON, no catalog component names, nothing that would give
  one format a head start over another.
- Every raw generation is preserved verbatim in `results/generations.jsonl`, so any number here
  can be audited or re-scored offline without regenerating anything (`pnpm extract` expands it
  into one file per generation).

### Adjustments made, and why

- **json-render**: the shipped shadcn catalog has no chart component, while the other three
  ship one. A `Chart` component was added through their own `defineCatalog` API, with a prop
  shape no richer than the others, so the chart family is not an automatic zero for a reason
  unrelated to format reliability.
- **json-render**: `catalog.validate()` (strict Zod) requires `children` on every element, but
  their own runtime `validateSpec()` does not and the renderer renders without it. `children`
  is defaulted to `[]` before the strict check, so we measure the renderer rather than the
  type definition. Without this json-render fails on every leaf element.
- **A2UI**: ships no injectable system prompt. A search of the pinned tree finds no prompt
  artifact at all — only `skills/a2ui-generation/`, an Agent Skill whose "Read Only What You
  Need" table tells a file-reading agent which `reference/*.md` to load per task, and which
  also expects to run `scripts/validate_a2ui.py`. For a plain chat completion it was flattened
  to `SKILL.md` plus the two docs that table marks **required** for Non-DTO Component mode
  (`component-catalog.md`, `component-design.md`), plus `data-binding.md` — which the table
  lists as *load-on-demand*, not required, but without which the binding-path rules the
  catalog relies on are absent. Including it is our judgement call, and it makes A2UI's prompt
  larger (and so more expensive) than a strict reading of the table would. A short note was
  appended telling the model it cannot read files or run scripts.
  The adaptation is itself a finding about portability: this format cannot be used through a
  plain chat completion without someone assembling a prompt for it.

### Scenarios excluded as asymmetric

These were deliberately left out of the scored corpus because they are natively expressible
in some formats and structurally impossible in others. Including them in either direction
would rig the result.

| Prompt | Why excluded | Would favour |
| --- | --- | --- |
| A pricing page with three plan cards side by side. | nested layout — json-render / OpenUI / A2UI express this natively; MDMA has no Row/Column primitive by design (layout comes from the surrounding Markdown) | the other three |
| A dashboard with a 2x2 grid of metric cards. | nested layout — same asymmetry as above | the other three |
| A refund form where the amount needs manager approval before it is submitted. | approval gate — MDMA has a first-class approval-gate component; the other three have no equivalent | MDMA |
| A patient intake form that flags which fields hold personal medical data. | PII flagging — MDMA has `sensitive: true` on fields; the other three have no equivalent | MDMA |
| A form that posts to our CRM endpoint when submitted. | webhook — MDMA has a webhook component; the other three have no equivalent | MDMA |

### Limitations

- 5 repeats per cell detects gross flakiness, not rare intermittent failures.
- Shape stability (section 3) is not comparable across formats — see the note there.
- One model per rung, so rung and vendor are confounded: a difference between rows may be a
  capability difference, a vendor difference, or both.
- Truncation is scored at a fixed 8192-token ceiling. A higher ceiling would move A2UI and
  json-render numbers; the ceiling is identical for every format, but it is a choice.
- Renderability is not semantic fidelity: a valid document that answers the wrong question
  scores as a pass. The scenarios are simple enough that this is rare, but it is not measured.
- CopilotKit OpenGenerativeUI is excluded from the quantitative comparison: it emits
  un-schema'd HTML/CSS/JS, so there is no validator to score against.
- Results are a snapshot against pinned upstream commits (see `vendor/PINS.txt`). These
  projects move weekly.

### Reproducing

```bash
pnpm verify     # adapter smoke test + cross-validation
pnpm models     # confirm model ids and pricing
pnpm bench --rungs small
pnpm score
pnpm report
```
