# Own-model eval — MDMA-IL DSL holdout gate

Self-contained eval for **our own hosted model** — `google/gemma-4-E4B-it` + the
**v3 MDMA-IL LoRA**.

## What this tests

Our model is **not** an NL chat model — it was fine-tuned to take **one MDMA-IL
DSL intent** as input and return an **MDMA document**. So this suite is a
**DSL holdout gate**, not the NL author suites the third-party models run:

- **Input:** the 95 held-out scenarios in **DSL** form
  (`../gemma/dataset/data/holdout-dsl.jsonl`, via `tests-dsl.mjs`).
- **System prompt:** the **thin** prompt the LoRA was fine-tuned with
  (`mobile-reality/mdma-il`). See "Why thin" below.
- **Assertion:** `validate-mdma` — every output must be a valid MDMA document.

## Why the thin prompt (not a spec/DSL-legend prompt)

Empirically measured against this endpoint:

1. **Context is only 2048 tokens** (`max_model_len`). A heavy system prompt
   doesn't leave room for output.
2. **Heavier prompts degrade the model.** Adding "use `onSubmit` / don't nest /
   top-level `type`" directives made it drop `type:`/`id:`, nest under a `form:`
   key, and hallucinate `type: action`. The thin prompt keeps it in-distribution.

So the system prompt here is exactly:

> You generate MDMA documents. Output only valid MDMA YAML blocks in markdown code fences.

## Observations (not conclusions)

This is a **small model** (Gemma 4 E4B + LoRA) — prompt-sensitive, with a
2048-token context. In short, on the DSL holdout, output validity against
the **current** validator moved with the system prompt: ~41% (thin prompt) →
~90.5% (current variant with a worked example). It is **not 100%**, and we have
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
- `prompt.mjs` — pins the thin `mobile-reality/mdma-il` system prompt; passes the
  DSL as the user message.
- `tests-dsl.mjs` — loads the DSL holdout into promptfoo test cases.
- `assertions/` — own copy of the assertion modules (self-contained).
- `results.json` — output of the last run (committed, reusable downstream).
