# Generative-UI format reliability benchmark

_Generated 2026-07-27T17:18:33.732Z · 1377 generations · 0 API errors_

Five open-source generative-UI formats, each generated natively from its own published
prompt and validated by its own validator, across a ladder of models.

**The question:** given a system prompt you can paste into any LLM, does the model emit
output you can actually render — every time, including on weak models?

**Formats tested:** MDMA · OpenUI Lang · json-render · A2UI (transport) · AGenUI (A2UI SDK)

Two entries come from the A2UI world and are **not** the same thing:
[`a2ui-project/a2ui`](https://github.com/a2ui-project/a2ui) is the protocol project
(**A2UI** below, using its own Python prompt generator and the standard v0.9 `basic`
catalog, transport format), and [`AGenUI/AGenUI`](https://github.com/AGenUI/AGenUI) is a
third-party native renderer SDK for it (**AGenUI** below, using its shipped Agent Skill).
They score very differently, which is why they are separate columns.

**Models tested:**

| Rung | Model | Provider id | Generations |
| --- | --- | --- | --- |
| flagship | Opus 5 | `anthropic/claude-opus-5` | 450 |
| mid | GPT-5.6-terra | `openai/gpt-5.6-terra` | 450 |
| small | Gemma-4-26B-A4B | `google/gemma-4-26b-a4b-it` | 450 |

All reached through OpenRouter, 5 repeats per scenario, temperature 0.7, max_tokens 8192 —
identical settings for every format and model.

## Summary — the three questions this benchmark set out to answer

### 1. How far down the model ladder does each format work?

Not "does it work on a flagship" — everything works on a flagship. The question is whether a
format still holds up on the cheap, small, open-weights models most products actually want to
run. Measured on the **"every time" rate** — the share of scenarios where all 5 repeats
rendered — because a format that works four times in five is not something you can ship:

| Format | Opus 5 (flagship) | Gemma-4-26B (open weights) | Drop |
| --- | --- | --- | --- |
| MDMA | 94.4% | 94.4% | 0.0pp |
| OpenUI Lang | 83.3% | 55.6% | 27.8pp |
| json-render | 83.3% | 38.9% | 44.4pp |
| A2UI (transport) | 83.3% | 44.4% | 38.9pp |
| AGenUI (A2UI SDK) | 38.9% \* | 77.8% | N/A |

\* **AGenUI's 38.9% on Opus 5 is not a format failure, and no drop can be read from that row.**
52% of its Opus 5 generations exceeded the 8k output ceiling, and a scenario that runs out of
tokens cannot have rendered every time — so the flagship figure is depressed by verbosity, not
by unreliability, which is why the drop is shown as N/A rather than as an apparent improvement
on the weaker model. Its Gemma figure carries the separate validator caveat flagged below:
12.2% under AGenUI's own script.

### 2. Is any of them built for one model vendor?

Whether a library is written *for* GPT, or *for* Gemini, and how much work it is to point it
at something else. None of the four hard-requires a vendor — but the defaults, examples and
tuning show who each one was built against:

| Format | Assumed provider | Vendor-specific work | Hard requirement? |
| --- | --- | --- | --- |
| MDMA | none | per-model prompt variants for OpenAI, Anthropic, Google, xAI, and its own model | no |
| OpenUI Lang | **OpenAI** | scaffold writes `OPENAI_API_KEY`; their own benchmark generates with `gpt-5.2` and counts tokens with the GPT-5 encoder | no — one prompt, no per-vendor tuning |
| json-render | none | none — one generated prompt for every model | no |
| A2UI | none | none — one generated prompt, no per-vendor tuning | no |
| AGenUI | none | none — docs say "try a few models and pick the one that fits best" | no |

So the split is: MDMA is the only one that *adapts* to the model, OpenUI is built against a
house vendor without requiring it, and json-render and AGenUI are vendor-neutral and
vendor-indifferent — one prompt, you find out how it lands.

### 3. Is it really an open protocol — can you paste the prompt into your own model?

If a project does not hand you a system prompt you can inject into your own LLM, it is a
closed framework you integrate with, not an open protocol you adopt.

| Format | Prompt you can inject? | How you get it |
| --- | --- | --- |
| MDMA | **yes — static text** | versioned string constants; per-model variants; no build step |
| OpenUI Lang | **yes — published text** | a committed `system-prompt.txt`, also regenerable from their JS library |
| json-render | yes, but **generated** | you must run `catalog.prompt()` from their TypeScript package to produce one |
| A2UI | yes, but **generated** | you must run their Python SDK (`a2ui_agent` prompt generator) to produce one |
| AGenUI | **no** | ships an Agent Skill with progressive disclosure, not a prompt — we had to flatten it |

MDMA and OpenUI hand you portable text. json-render ties the protocol to a TypeScript runtime
— fine in Node, an obstacle from Python or Go. AGenUI ships no prompt at all, so we assembled
one. (CopilotKit is the same shape and emits un-schema'd HTML, which is why it is not scored.)

Prompt size matters here — you pay it on every request:

| Format | Prompt tokens ↓ |
| --- | --- |
| OpenUI Lang | 5172 |
| MDMA | 5910 |
| json-render | 8466 |
| A2UI (transport) | 16085 |
| AGenUI (A2UI SDK) | 19689 |

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
| Formats | 5 |
| Models | 3 |
| Repeats per scenario | 5 |
| Total generations | 1377 |
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
| A2UI (transport) | a2ui_agent TransportFormat.prompt_generator.generate() — A2UI's own Python SDK | 16085 |
| AGenUI (A2UI SDK) | flattened AGenUI skills/a2ui-generation SKILL.md + refs (AGenUI @ 3e79bea) | 19689 |

## 1. Renderable rate — ↑ higher is better

Share of generations that parse and validate — i.e. that a renderer could render.

| Model | MDMA | OpenUI Lang | json-render | A2UI (transport) | AGenUI (A2UI SDK) |
| --- | --- | --- | --- | --- | --- |
| **flagship** |  |  |  |  |  |
| Opus 5 | 100.0% | 98.8% | 100.0% | 96.4% | 100.0% |
| **mid** |  |  |  |  |  |
| GPT-5.6-terra | 91.1% | 100.0% | 93.3% | 86.7% | 81.1% |
| **small** |  |  |  |  |  |
| Gemma-4-26B-A4B | 98.9% | 83.3% | 83.3% | 81.1% | 93.3% |

> ⚠️ **AGenUI's column is measured on a looser standard than AGenUI's own tooling applies.** Every
> format here is checked for structural renderability, but AGenUI additionally ships an 889-line
> `validate_a2ui.py`, and under *that* script the same generations score 84.2% / 70.0% /
> **12.2%** instead of 100% / 81.1% / 93.3%. The Gemma row is the one to be careful with.
> See [Cross-check: AGenUI's own validator is much stricter than ours](#cross-check-agenuis-own-validator-is-much-stricter-than-ours).

### Truncation — ↓ lower is better (output that exceeded the shared 8192-token ceiling)

Truncated generations are **excluded from the renderable rate above** and reported here
instead. A response cut off mid-structure tells us the format is verbose, not that the model
cannot produce it — charging it as a format failure would penalise verbose formats for our
budget choice rather than for anything about their reliability.

It is still a real cost. Truncation here means: at 8k output tokens, that format did not fit.

| Model | MDMA | OpenUI Lang | json-render | A2UI (transport) | AGenUI (A2UI SDK) |
| --- | --- | --- | --- | --- | --- |
| **flagship** |  |  |  |  |  |
| Opus 5 | 4.4% | 8.9% | 12.2% | 7.8% | 52.2% |
| **mid** |  |  |  |  |  |
| GPT-5.6-terra | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| **small** |  |  |  |  |  |
| Gemma-4-26B-A4B | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |

## 2. "Every time" rate — ↑ higher is better

Share of scenarios where **all 5 repeats** rendered. This is the number that matters if
you are shipping a product: a format that works 4 times in 5 still breaks in production.

| Model | MDMA | OpenUI Lang | json-render | A2UI (transport) | AGenUI (A2UI SDK) |
| --- | --- | --- | --- | --- | --- |
| **flagship** |  |  |  |  |  |
| Opus 5 | 94.4% | 83.3% | 83.3% | 83.3% | 38.9% |
| **mid** |  |  |  |  |  |
| GPT-5.6-terra | 83.3% | 100.0% | 72.2% | 61.1% | 72.2% |
| **small** |  |  |  |  |  |
| Gemma-4-26B-A4B | 94.4% | 55.6% | 38.9% | 44.4% | 77.8% |

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

| Model | MDMA | OpenUI Lang | json-render | A2UI (transport) | AGenUI (A2UI SDK) |
| --- | --- | --- | --- | --- | --- |
| **flagship** |  |  |  |  |  |
| Opus 5 | 16.7% | 5.6% | 5.6% | 5.6% | 5.6% |
| **mid** |  |  |  |  |  |
| GPT-5.6-terra | 72.2% | 5.6% | 5.6% | 11.1% | 5.6% |
| **small** |  |  |  |  |  |
| Gemma-4-26B-A4B | 72.2% | 5.6% | 0.0% | 5.6% | 5.6% |

## 4. Output tokens (↓ lower is better) and efficiency (↑ higher is better)

Efficiency is `renderable rate / avg output tokens x 1000` — renderable output per 1k tokens.
Cheap output nobody can render is not cheap.

**Mean output tokens — ↓ lower is better:**

| Model | MDMA | OpenUI Lang | json-render | A2UI (transport) | AGenUI (A2UI SDK) |
| --- | --- | --- | --- | --- | --- |
| **flagship** |  |  |  |  |  |
| Opus 5 | 1666 | 1814 | 4019 | 3892 | 7209 |
| **mid** |  |  |  |  |  |
| GPT-5.6-terra | 554 | 567 | 1020 | 1081 | 1674 |
| **small** |  |  |  |  |  |
| Gemma-4-26B-A4B | 448 | 417 | 836 | 1300 | 1485 |

**Efficiency — ↑ higher is better (renderable output per 1k output tokens):**

| Model | MDMA | OpenUI Lang | json-render | A2UI (transport) | AGenUI (A2UI SDK) |
| --- | --- | --- | --- | --- | --- |
| **flagship** |  |  |  |  |  |
| Opus 5 | 0.60 | 0.54 | 0.25 | 0.25 | 0.14 |
| **mid** |  |  |  |  |  |
| GPT-5.6-terra | 1.64 | 1.77 | 0.91 | 0.80 | 0.48 |
| **small** |  |  |  |  |  |
| Gemma-4-26B-A4B | 2.21 | 2.00 | 1.00 | 0.62 | 0.63 |

## 5. Failure taxonomy — ↓ lower is better (0 is perfect)

| Format | broken-reference | no-structured-output | off-task | parse-error | prose-leakage | schema-error | truncated | unknown-component |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MDMA | 0 | 6 | 2 | 1 | 0 | 0 | 4 | 0 |
| OpenUI Lang | 142 | 0 | 0 | 0 | 0 | 57 | 8 | 1 |
| json-render | 27 | 0 | 0 | 0 | 0 | 26 | 11 | 0 |
| A2UI (transport) | 0 | 0 | 0 | 32 | 0 | 0 | 7 | 0 |
| AGenUI (A2UI SDK) | 3 | 13 | 7 | 0 | 2 | 0 | 47 | 0 |

## 6. Renderable rate by scenario family — ↑ higher is better

| Family | MDMA | OpenUI Lang | json-render | A2UI (transport) | AGenUI (A2UI SDK) |
| --- | --- | --- | --- | --- | --- |
| contact-form | 100.0% | 100.0% | 93.3% | 82.2% | 77.8% |
| data-table | 82.2% | 86.7% | 82.2% | 66.7% | 66.7% |
| chart | 97.8% | 93.3% | 95.6% | 95.6% | 80.0% |
| callout | 100.0% | 91.1% | 95.6% | 95.6% | 93.3% |
| button | 100.0% | 97.8% | 88.9% | 100.0% | 88.9% |
| tasklist | 91.1% | 77.8% | 73.3% | 73.3% | 37.8% |

**By variant** — the adversarial variant is where formats separate:

| Variant | MDMA | OpenUI Lang | json-render | A2UI (transport) | AGenUI (A2UI SDK) |
| --- | --- | --- | --- | --- | --- |
| minimal | 100.0% | 93.3% | 95.6% | 92.2% | 87.8% |
| realistic | 98.9% | 97.8% | 90.0% | 87.8% | 71.1% |
| adversarial | 86.7% | 82.2% | 78.9% | 76.7% | 63.3% |

## Method and fairness

- Every format uses **its own published prompt, unmodified**, from its own official artifact
  or prompt-generation API. None of the prompts were written by us.
- Every format is validated by **its own validator** — MDMA by `@mobile-reality/mdma-validator`,
  json-render by `validateSpec()` + `catalog.validate()`, OpenUI by `createParser()` from
  `@openuidev/lang-core`, AGenUI against the shipped `agenui_catalog.json`.
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
- **AGenUI**: ships no injectable system prompt. A search of the pinned tree finds no prompt
  artifact at all — only `skills/a2ui-generation/`, an Agent Skill whose "Read Only What You
  Need" table tells a file-reading agent which `reference/*.md` to load per task, and which
  also expects to run `scripts/validate_a2ui.py`. For a plain chat completion it was flattened
  to `SKILL.md` plus the two docs that table marks **required** for Non-DTO Component mode
  (`component-catalog.md`, `component-design.md`), plus `data-binding.md` — which the table
  lists as *load-on-demand*, not required, but without which the binding-path rules the
  catalog relies on are absent. Including it is our judgement call, and it makes AGenUI's prompt
  larger (and so more expensive) than a strict reading of the table would. A short note was
  appended telling the model it cannot read files or run scripts.
  The adaptation is itself a finding about portability: this format cannot be used through a
  plain chat completion without someone assembling a prompt for it.

### What each format is validated by

| Format | Validated by | First-party checker left unused |
| --- | --- | --- |
| MDMA | `@mobile-reality/mdma-validator`, autofix off | none |
| OpenUI Lang | `createParser()` + `meta.errors` / `unresolved` / `orphaned` | none — their exported `validate()` is a form-field rule runner, not a document checker |
| json-render | `validateSpec()` (runtime) **and** `catalog.validate()` (strict Zod) | none — remaining exports are field-level validation, a repair helper, a formatter |
| A2UI | their own `TransportParser.parse_response()` (schema compilation) via `a2ui-python/` | none |

### Cross-check: AGenUI's own validator is much stricter than ours

AGenUI ships an 889-line validation script (`skills/a2ui-generation/scripts/validate_a2ui.py`).
Our adapter does **not** use it: it checks structural renderability only, which is the same
standard applied to the other three formats. Theirs additionally enforces a style-key
whitelist, padding/border shorthand formats, per-component required fields, button action
structure, and some design guidance.

Running their script over all 218 non-truncated AGenUI generations shows how far apart the two
standards are (`pnpm tsx src/crosscheck-agenui.mts` reproduces this):

| Model | Our validator ↑ | Their validator ↑ | Gap |
| --- | --- | --- | --- |
| Opus 5 | 100.0% | 84.2% | 15.8pp |
| GPT-5.6-terra | 81.1% | 70.0% | 11.1pp |
| Gemma-4-26B-A4B | 93.3% | 12.2% | **81.1pp** |

**AGenUI's numbers in this report are therefore generous to AGenUI**, dramatically so on the
open-weights rung. Read the 93.3% as "structurally renderable", not as "would pass AGenUI's own
quality gate".

We did not adopt their script, because doing so would hold AGenUI to a materially different
standard than the other three formats. Their top failure reasons are mostly style-lint rather
than parse failures — `padding shorthand must use 4 px values` (60), `text-only style key
'color' is not allowed on non-Text component` (39), `root should not set a solid
background-color` (26) — and the equivalent house-style rules were excluded for MDMA too
(`thinking-block`). Some of them do look renderer-level rather than cosmetic, though, so the
true figure for AGenUI sits somewhere between the two columns above rather than at either end.

### Scenarios excluded as asymmetric

These were deliberately left out of the scored corpus because they are natively expressible
in some formats and structurally impossible in others. Including them in either direction
would rig the result.

| Prompt | Why excluded | Would favour |
| --- | --- | --- |
| A pricing page with three plan cards side by side. | nested layout — json-render / OpenUI / AGenUI express this natively; MDMA has no Row/Column primitive by design (layout comes from the surrounding Markdown) | the other three |
| A dashboard with a 2x2 grid of metric cards. | nested layout — same asymmetry as above | the other three |
| A refund form where the amount needs manager approval before it is submitted. | approval gate — MDMA has a first-class approval-gate component; the other three have no equivalent | MDMA |
| A patient intake form that flags which fields hold personal medical data. | PII flagging — MDMA has `sensitive: true` on fields; the other three have no equivalent | MDMA |
| A form that posts to our CRM endpoint when submitted. | webhook — MDMA has a webhook component; the other three have no equivalent | MDMA |

### Limitations

- 5 repeats per cell detects gross flakiness, not rare intermittent failures.
- Shape stability (section 3) is not comparable across formats — see the note there.
- Truncation is scored at a fixed 8192-token ceiling. A higher ceiling would move AGenUI and
  json-render numbers; the ceiling is identical for every format, but it is a choice.
- Renderability is not semantic fidelity: a valid document that answers the wrong question
  scores as a pass. The scenarios are simple enough that this is rare, but it is not measured.
- The four validators are not equally calibrated. Each format is checked by its own tooling,
  but AGenUI's first-party script enforces much more than structural renderability, so A2UI's
  figures here are the most generous of the four — see the cross-check section for the size of
  the gap. OpenUI and json-render ship no stricter checker than the ones already used.
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
