# Own-model eval — MDMA-IL DSL holdout gate

Self-contained eval for **our own hosted model** — `google/gemma-4-E4B-it` + the
**v3 MDMA-IL LoRA**.

## What this tests

Our model is **not** an NL chat model — it was fine-tuned to take **one MDMA-IL
DSL intent** as input and return an **MDMA document**. So this suite is a
**DSL holdout gate**, not the NL author suites the third-party models run:

- **Input:** the 95 held-out scenarios in **DSL** form
  (`../gemma/dataset/data/holdout-dsl.jsonl`, via `tests-dsl.mjs`).
- **System prompt:** the `mobile-reality/mdma-il` author prompt from the prompt
  pack — DSL input grammar + authoring rules + worked form/table/chart examples.
- **Assertion:** `validate-mdma` — every output must be a valid MDMA document.

## Why a DSL-aware prompt (not a bare instruction)

The system prompt **must describe the MDMA-IL DSL** the model reads — a bare
"generate MDMA" instruction is out-of-distribution, since the model's whole job
is to interpret a DSL intent. Empirically measured against this endpoint:

1. **The DSL grammar is required.** Without the grammar section the model
   misreads the intent and drops `type:`/`id:`, nests under a `form:` key, or
   hallucinates `type: action`.
2. **A worked example anchors the output shape.** On the DSL holdout, validity
   moved from ~41% (bare instruction) to ~90.5% once the prompt carried the DSL
   grammar plus a worked example.

The small E4B model has only a 2048-token context (`max_model_len`), so the
prompt stays lean while still teaching the DSL — grammar + a few examples, not a
full spec dump.

## Observations (not conclusions)

This is a **small model** (Gemma 4 E4B + LoRA) — prompt-sensitive, with a
2048-token context. In short, on the DSL holdout, output validity against
the **current** validator moved with the system prompt: ~41% (bare prompt) →
~90.5% (DSL-aware prompt with a worked example). It is **not 100%**, and we have
**not** concluded whether the residual gap calls for a retrain, output
normalization, or more prompt work — that's an open question.

## Configure & run

Set in `../.env` (dedicated vars, not `EVAL_PROVIDER`):

```
OWN_MODEL_PROVIDER=openai:chat:mdma-v3                              # served LoRA id
OWN_MODEL_BASE_URL=https://…modal.run/v1                            # OpenAI-compatible base URL
OWN_MODEL_API_KEY=EMPTY                                             # placeholder while auth is off
```

```bash
pnpm --filter @mobile-reality/mdma-evals eval:own-model   # run the gate
pnpm --filter @mobile-reality/mdma-evals eval:view        # view results
```

If `holdout-dsl.jsonl` is missing (it's gitignored/generated), build it first
with `pnpm --filter @mobile-reality/mdma-evals dataset:build`, or point
`OWN_MODEL_HOLDOUT` at your copy.

## Contents

- `promptfooconfig.own-model.yaml` — the gate config.
- `prompt.mjs` — pins the `mobile-reality/mdma-il` system prompt; passes the
  DSL as the user message.
- `tests-dsl.mjs` — loads the DSL holdout into promptfoo test cases.
- `assertions/` — own copy of the assertion modules (self-contained).
- `results.json` — output of the last run (committed, reusable downstream).
