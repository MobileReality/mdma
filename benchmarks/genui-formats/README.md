# Generative-UI format reliability benchmark

Four open-source generative-UI formats, each **generated natively from its own published prompt**
and **validated by its own validator**, across a ladder of models from flagship down to open-weights.

| Format | Wire format | Prompt source |
| --- | --- | --- |
| [MDMA](https://github.com/MobileReality/mr-mdma) | Markdown + YAML in ` ```mdma ` blocks | `buildSystemPrompt()` + per-model author variant |
| [OpenUI Lang](https://github.com/thesysdev/openui) | line-oriented DSL | `benchmarks/system-prompt.txt` (their own published artifact) |
| [json-render](https://github.com/vercel-labs/json-render) | JSONL of RFC-6902 patches | `catalog.prompt()` |
| [A2UI / AGenUI](https://github.com/AGenUI/AGenUI) | A2UI v0.9 JSON messages | `skills/a2ui-generation/SKILL.md` + required refs, flattened |

[CopilotKit OpenGenerativeUI](https://github.com/CopilotKit/OpenGenerativeUI) is excluded from the
quantitative run: it emits un-schema'd HTML/CSS/JS, so there is nothing to validate against.

## Why this exists

`thesysdev/openui` publishes a benchmark claiming OpenUI Lang uses ~53% fewer tokens than
json-render and Thesys C1. Per its own `benchmarks/README.md`, that benchmark prompts `gpt-5.2`
once to emit OpenUI Lang, parses it, and then **mechanically converts the AST** into the competitor
formats. No competing format is ever produced by a model, validity is true by construction, and only
one flagship model is tested.

That measures compression. It does not measure whether a model can produce the format. This
benchmark measures the latter:

| Metric | Direction | Meaning |
| --- | --- | --- |
| Renderable rate | **↑ higher** | share of generations a renderer could actually render |
| Truncation rate | **↓ lower** | share that hit the 8k output ceiling — the format didn't fit |
| "Every time" rate | **↑ higher** | share of scenarios where *all k repeats* rendered. The number that matters if you are shipping something |
| Shape stability | **↑ higher** | share of scenarios where all k repeats produced the same structure. Within-format only |
| Output tokens | **↓ lower** | mean completion tokens — drives cost and time-to-render |
| Prompt tokens | **↓ lower** | system-prompt size, paid on every request |
| Efficiency | **↑ higher** | renderable rate per 1k output tokens. Cheap output nobody can render is not cheap |
| Failure counts | **↓ lower** | parse errors, unknown components, broken references, truncation, prose leakage |

Renderable rate and truncation rate are not complements: truncated generations are removed from
the renderable denominator, so a format can be 100% renderable and 52% truncated at the same time
— "everything that fit was valid, but half of it didn't fit".

## Fairness rules

- Every format uses **its own published prompt, unmodified**. None were written by us.
- Every format is validated by **its own validator**.
- **Auto-repair is off for every format**, including MDMA's — the question is what the model
  produced, not what a repair layer can rescue.
- One standard for failure across all four: **fatal** = the renderer produces something broken,
  blank or missing; **degraded** = renders with a cosmetic loss (dropped surplus prop, stray code
  fence), recorded but not counted against the format.
- Identical user prompts, temperature (0.7) and token limit (8192) everywhere.
- Prompts are plain natural language with **no format hints**.
- Scenarios only cover what all four express natively. Nested-layout prompts (which MDMA cannot
  express by design) and approval-gate / PII / webhook prompts (which the others cannot) are
  excluded and listed in the report.
- Every raw generation is preserved verbatim in `results/generations.jsonl`, which is committed.
  Run `pnpm extract` to expand it into one text file per generation under `results/raw/` for
  reading or grepping — that directory is derived data and stays out of git.

Adjustments we had to make — a `Chart` component for json-render's catalog, `children` defaulting,
and flattening A2UI's agent skill into an injectable prompt — are documented in the generated report
under "Adjustments made, and why".

## Layout

```
src/
  scenarios.ts        18 neutral prompts (6 families x 3 variants)
  models.ts           the 9-model ladder, ids verified against OpenRouter
  adapters/           one per format: systemPrompt() + validate()
  fixtures.ts         hand-written valid/corrupted samples per format
  verify-adapters.ts  proves each validator discriminates
  verify-models.ts    confirms model ids + prints pricing
  run.ts              generation loop, resumable, writes results/generations.jsonl
  score.ts            offline scoring -> results/results.json
  report.ts           results.json -> results/REPORT.md
  inspect.ts          print validation issues for stored generations
vendor/               pinned upstream artifacts + PINS.txt (commit SHAs)
results/              ledger, raw generations, results.json, REPORT.md
```

## Running

```bash
cp .env.example .env      # add OPENROUTER_API_KEY

pnpm verify               # adapter smoke test + cross-validation — run this first
pnpm models               # confirm model ids still exist, print pricing

pnpm bench --rungs small --dry     # print the plan, call nothing
pnpm bench --rungs small           # ~1,080 generations
pnpm bench                         # everything: 3,240 generations, ~$78

pnpm score                # offline, free, re-runnable
pnpm report               # writes results/REPORT.md
```

Useful filters: `--models <id,...>`, `--formats mdma,openui`, `--scenarios contact-form`,
`--k <n>`. Runs are resumable — anything already in `results/generations.jsonl` is skipped.

`pnpm verify` is not optional. It checks that each validator accepts its own valid fixture, rejects
its own corrupted fixture, and **rejects all three foreign formats**. A validator that accepts
another format's output is not discriminating, and every number it produces is noise.
