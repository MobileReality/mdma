# Gemma 4 26B MoE — Reasoning Repetition Loops

> Status: investigation + mitigation plan
> Model: `gemma-4-26B-A4B` (merged, int8), served via vLLM **nightly** build on Modal
> Deploy: [`serve_26b_int8_nightly.py`](../../../mdma-rl/training/serving/serve_26b_int8_nightly.py) — this is what we run in production
> Product client: [`demo/src/agent/openai-agent-client.ts`](../../demo/src/agent/openai-agent-client.ts)

## 1. The issue

The fine-tuned 26B MoE passes all evals and holdouts, but **intermittently** the model's
reasoning collapses into a degenerate loop. A normal thinking block runs away into hundreds of
repeated tokens/phrases — e.g. endless `(END) (DONE) (STOP) (FINAL) ...` — that eats the entire
generation budget.

Two things are happening at once:

1. **Repetition collapse (decoding).** The output degrades in stages: word-doubling →
   token-doubling → a single token/phrase flooding the rest of the budget. This is a
   distribution-tail problem, not a weights problem — the fine-tune itself is fine.
2. **Turn-boundary confusion (prompt) — the trigger.** The runaway often starts because the
   model second-guesses whether a new `[system]` turn has arrived ("is it my turn to emit
   step 3 or not?"). That anxious loop is what the repetition collapse then latches onto and
   amplifies.

It is **intermittent** because it lives in the sampling tail — that's why a single eval pass
looks clean while real traffic occasionally trips it.

## 2. What the research says

This maps almost exactly onto a **known, documented Gemma 4 defect** — not our fine-tune, not
our serving stack:

- **It's a model-level trait of the Gemma 4 generation.** Open bug reports describe the exact
  symptom on **Gemma 4 26B-A4B (our MoE) and 31B dense**: word-doubling → token-doubling →
  single-token flooding. It reproduces across **vLLM, Ollama, LMStudio, Cloudflare**, so it is
  the model, not the backend. **Gemma 3 27B does not have it.**
- **Structured / grammar-constrained decoding amplifies it.** When a grammar mask restricts the
  token space, repeated tokens stay "valid" and EOS gets suppressed, so the model can't break
  out. **Note: this does *not* apply to us** — we use `--tool-call-parser gemma4`, not
  `guided_decoding`/xgrammar. One less thing to fix.
- **Plain `repeat_penalty` alone is weak here** (reports tested 1.0 / 1.15 / 1.5 with the same
  collapse). The reliable tail-cutter is **`min_p`**; the phrase-level fix elsewhere is the
  **DRY sampler** — but **DRY is not available in vLLM** (it's a llama.cpp/ooba feature), so on
  our stack the realistic knobs are `min_p` + `repetition_penalty` (+ `frequency_penalty`).
- Because the underlying collapse is an **acknowledged, unfixed** Gemma 4 trait, no single
  setting is guaranteed airtight — pair sampling changes with a cheap loop-detector.

Sources:

- [vLLM #40080 — Gemma 4 (31B/26B-A4B) infinite repetition loops with structured output](https://github.com/vllm-project/vllm/issues/40080)
- [google-deepmind/gemma #622 — Gemma 4 token repetition collapse (31b dense & 26b MoE)](https://github.com/google-deepmind/gemma/issues/622)
- [QwQ-32B: How to Run effectively (sampler ordering / loop fixes) — Unsloth](https://unsloth.ai/docs/models/tutorials/qwq-32b-how-to-run-effectively)
- [DRY: a modern repetition penalty that reliably prevents looping — oobabooga PR #5677](https://github.com/oobabooga/textgen/pull/5677)
- [Maximizing Model Performance via Samplers/Parameters — DavidAU (min_p / DRY ranges)](https://huggingface.co/DavidAU/Maximizing-Model-Performance-All-Quants-Types-And-Full-Precision-by-Samplers_Parameters/blob/main/README.md)
- [Circular Reasoning: Self-Reinforcing Loops in Large Reasoning Models (arXiv)](https://arxiv.org/pdf/2601.05693)

## 3. Recommendation — what to change

Do **not** swap the model. The fix is decoding + prompt, and the main part needs **no redeploy**
because our endpoint is vLLM OpenAI-compatible and these are per-request params.

### 3a. Per-request sampling (primary fix, no redeploy)

Add to the request body in all three call sites:

- `min_p: 0.02` — primary tail-cutter for the degenerate loop
- `repetition_penalty: 1.1` — start low; raise only if needed (too high hurts valid output)
- keep `max_tokens` tight on the reasoning turn so a runaway can't eat the whole budget

Call sites:

1. **Product client** — [`demo/src/agent/openai-agent-client.ts`](../../demo/src/agent/openai-agent-client.ts).
   This fixes production.
2. **Eval harness** — [`run-conversation.mjs:48-54`](run-conversation.mjs#L48-L54) (the `gen()`
   body) + the `config:` blocks in each `promptfooconfig.own-model-*.yaml`. So we can measure
   loop-rate before/after.
3. **Holdout probe** — [`run_holdout_endpoint.py:42-49`](../../../mdma-rl/training/serving/run_holdout_endpoint.py#L42-L49).

### 3b. System prompt (assist for the trigger)

Tighten turn/reasoning rules so the model never spirals on turn boundaries:

- "Each `[system]` message is a complete instruction. Emit exactly one document for the current
  step, then stop. Never reason about whether a turn has arrived."
- "Keep the thinking block under N sentences. Do not re-verify completed steps. Never repeat a
  token or phrase."

### 3c. Safety net (regardless of the above)

Add a cheap **loop detector** (sliding-window word-diversity floor) that aborts the stream when
the output collapses — because the collapse is an unfixed Gemma 4 trait, don't rely on any
single setting being airtight. Implemented in
[`openai-agent-client.ts`](../../demo/src/agent/openai-agent-client.ts).

**Important — guard BOTH channels.** The collapse usually lives in the `reasoning` channel, but
it can also **leak onto `content`**: the model emits a valid MDMA document, then keeps going
with a raw "Thinking Process:" ramble *after* the `gemma4` reasoning-parser has already closed
the reasoning span. A detector wired only to `reasoning` misses this entirely, and the runaway
only stops at the hard stream ceilings (4 MB / 240 s) — rare, but huge when it hits. We now run
an independent detector on each channel. A legit document sits well above the diversity floor,
so guarding `content` does not false-positive on real output.

### Not needed / not available

- **No redeploy** required for 3a (per-request params).
- **DRY sampler** — not supported by vLLM; would require switching serving engine. Last resort.
- **`guided_decoding`/grammar relax** — N/A, we don't use it.
- **Server-side defaults** — only touch [`serve_26b_int8_nightly.py`](../../../mdma-rl/training/serving/serve_26b_int8_nightly.py)
  if we later want to bake these defaults in globally.

### Order of operations

1. Edit the demo client (3a) → confirm loops drop in manual testing.
2. Mirror into the eval harness → rerun `evals/own-model/` to confirm loop-rate down **and**
   pass-rate unchanged.
3. Tighten the system prompt (3b).
4. Loop detector (3c) — **done**, now covers both `reasoning` and `content` channels.
