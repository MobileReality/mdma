/**
 * The model ladder. Three rungs x three vendors.
 *
 * Every id here was confirmed against the live OpenRouter catalog
 * (`GET https://openrouter.ai/api/v1/models`) — run `pnpm models` to re-check
 * before a run, since OpenRouter retires preview ids without notice.
 *
 * Our own fine-tuned MDMA model is deliberately absent: this benchmark measures
 * published protocols against stock models. A model trained on one of the four
 * formats would make its column meaningless.
 */

export type Rung = 'flagship' | 'mid' | 'small';

export interface ModelSpec {
  /** OpenRouter model id. */
  id: string;
  /** Short label for report tables. */
  label: string;
  rung: Rung;
  vendor: 'anthropic' | 'openai' | 'google';
  /**
   * Provider id in the form `evals/select-prompt.mjs` expects, so MDMA's
   * per-model author variant resolves exactly as it does in the existing evals.
   */
  promptSelector: string;
  /**
   * Some models stream reasoning tokens into the content channel, which
   * corrupts every format's output. Mirrors the `passthrough.reasoning.exclude`
   * handling already in `evals/promptfooconfig.js`.
   */
  suppressReasoning?: boolean;
  /** Recorded in the report when the requested model was not available as-is. */
  substitutionNote?: string;
  /**
   * Set when prompt-pack has no author variant for this model and MDMA falls
   * back to its generic prompt. Disclosed in the report: it is what a real
   * integrator gets today, but it means MDMA is not running its best prompt
   * on that row.
   */
  mdmaPromptFallback?: boolean;
}

export const MODELS: ModelSpec[] = [
  // ------------------------------------------------------------- flagship
  {
    id: 'anthropic/claude-opus-5',
    label: 'Opus 5',
    rung: 'flagship',
    vendor: 'anthropic',
    promptSelector: 'openrouter:anthropic/claude-opus-5',
  },
  {
    id: 'openai/gpt-5.6-sol',
    label: 'GPT-5.6-sol',
    rung: 'flagship',
    vendor: 'openai',
    promptSelector: 'openrouter:openai/gpt-5.6-sol',
  },
  {
    id: 'google/gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro',
    rung: 'flagship',
    vendor: 'google',
    promptSelector: 'openrouter:google/gemini-3.1-pro-preview',
    suppressReasoning: true,
  },

  // ------------------------------------------------------------------ mid
  {
    id: 'anthropic/claude-sonnet-5',
    label: 'Sonnet 5',
    rung: 'mid',
    vendor: 'anthropic',
    promptSelector: 'openrouter:anthropic/claude-sonnet-5',
  },
  {
    id: 'openai/gpt-5.6-terra',
    label: 'GPT-5.6-terra',
    rung: 'mid',
    vendor: 'openai',
    promptSelector: 'openrouter:openai/gpt-5.6-terra',
  },
  {
    id: 'google/gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    rung: 'mid',
    vendor: 'google',
    promptSelector: 'openrouter:google/gemini-3.5-flash',
    suppressReasoning: true,
  },

  // ---------------------------------------------------------------- small
  {
    id: 'openai/gpt-5.4-mini',
    label: 'GPT-5.4-mini',
    rung: 'small',
    vendor: 'openai',
    promptSelector: 'openrouter:openai/gpt-5.4-mini',
  },
  {
    // The `-preview` id, not the bare one: prompt-pack ships
    // `google/gemini-3.1-flash-lite-preview.ts`, and the selector matches by
    // substring, so the bare id would silently fall back to the default prompt
    // and benchmark MDMA with a prompt no integrator on this model would use.
    id: 'google/gemini-3.1-flash-lite-preview',
    label: 'Gemini 3.1 Flash-Lite',
    rung: 'small',
    vendor: 'google',
    promptSelector: 'openrouter:google/gemini-3.1-flash-lite-preview',
    suppressReasoning: true,
  },
  {
    id: 'google/gemma-4-26b-a4b-it',
    label: 'Gemma-4-26B-A4B',
    rung: 'small',
    vendor: 'google',
    promptSelector: 'openrouter:google/gemma-4-26b-a4b-it',
  },
];

export const RUNGS: Rung[] = ['flagship', 'mid', 'small'];

export function modelsForRungs(rungs: Rung[]): ModelSpec[] {
  return MODELS.filter((m) => rungs.includes(m.rung));
}
