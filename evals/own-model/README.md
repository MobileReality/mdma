# Own-model eval — MDMA-IL DSL holdout gate

**Model:** https://huggingface.co/MobileReality/mdma-gemma4-26b-dsl-unsloth-v1

Self-contained eval for **our own hosted model** —
[`MobileReality/mdma-gemma4-26b-dsl-unsloth-v1`](https://huggingface.co/MobileReality/mdma-gemma4-26b-dsl-unsloth-v1),
an Unsloth fine-tune of `unsloth/gemma-4-26B-A4B-it` (Gemma 4 26B-A4B — a MoE
with ~4B active / ~27B total params) with the MDMA-IL DSL LoRA **merged into the
base weights** (published as BF16; served INT8-quantized behind an
OpenAI-compatible Modal endpoint).

## What this tests

Our model is **not** an NL chat model — it was fine-tuned to take **one MDMA-IL
DSL intent** as input and return an **MDMA document**. So this suite is a
**DSL holdout gate**, not the NL author suites the third-party models run:

- **Input:** the 95 held-out scenarios in **DSL** form
  (`../gemma/dataset/data/holdout-dsl.jsonl`, via `tests-dsl.mjs`).
- **System prompt:** the `mobile-reality/mdma-il` author prompt from the prompt
  pack — DSL input grammar + authoring rules + worked form/table/chart examples.
- **Assertion:** `validate-mdma` — every output must be a valid MDMA document.

## Why a DSL-aware prompt

The system prompt **must describe the MDMA-IL DSL** the model reads — a bare
"generate MDMA" instruction is out-of-distribution, since the model's whole job
is to interpret a DSL intent:

1. **The DSL grammar is required.** Without the grammar section the model
   misreads the intent and drops `type:`/`id:`, nests under a `form:` key, or
   hallucinates `type: action`.
2. **A worked example anchors the output shape.** The grammar plus a worked
   example keeps outputs in-distribution.

The model is served with `enable_thinking: false` plus a repetition guard
(`min_p`, `repetition_penalty`) to suppress the Gemma 4 reasoning-loop failure
mode — see `promptfooconfig.own-model.yaml` and the
[model card](https://huggingface.co/MobileReality/mdma-gemma4-26b-dsl-unsloth-v1)
for the full serving contract.

## Observations

On the current **26B** model the DSL-aware prompt passes **all 95 holdout
cases** (`results.json`) against the current validator. The earlier, smaller
Gemma 4 **E4B** model (2048-token context) topped out around ~90.5% valid on
the same holdout.

## Configure & run

Set in `../.env` (dedicated vars, not `EVAL_PROVIDER`):

```
OWN_MODEL_PROVIDER=openai:chat:mdma-26b                             # served model id
OWN_MODEL_BASE_URL=https://.../v1                            # OpenAI-compatible base URL
OWN_MODEL_API_KEY=unused                                            # placeholder while auth is off
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
