/**
 * Static registry of every available MDMA Author Prompt variant.
 *
 * The evals harness discovers variants by walking the filesystem, but
 * downstream consumers (the demo, web apps, CLI) can't do that. This
 * registry is a hand-curated list — when a new variant ships under
 * `<vendor>/<model>.ts`, add a corresponding entry here so it shows up
 * in the demo's "System Prompt" picker.
 */

import { MDMA_AUTHOR_PROMPT_HAIKU } from './anthropic/haiku.js';
import { MDMA_AUTHOR_PROMPT_OPUS_4_6 } from './anthropic/opus-4.6.js';
import { MDMA_AUTHOR_PROMPT_OPUS_4_7 } from './anthropic/opus-4.7.js';
import { MDMA_AUTHOR_PROMPT_SONNET } from './anthropic/sonnet.js';
import { MDMA_AUTHOR_PROMPT_GEMINI_2_5_FLASH } from './google/gemini-2.5-flash.js';
import { MDMA_AUTHOR_PROMPT_GEMINI_2_5_FLASH_LITE } from './google/gemini-2.5-flash-lite.js';
import { MDMA_AUTHOR_PROMPT_GEMINI_2_5_PRO } from './google/gemini-2.5-pro.js';
import { MDMA_AUTHOR_PROMPT_GEMINI_3_FLASH_PREVIEW } from './google/gemini-3-flash-preview.js';
import { MDMA_AUTHOR_PROMPT_GEMINI_3_1_FLASH_LITE_PREVIEW } from './google/gemini-3.1-flash-lite-preview.js';
import { MDMA_AUTHOR_PROMPT_GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS } from './google/gemini-3.1-pro-preview-customtools.js';
import { MDMA_AUTHOR_PROMPT_GEMINI_3_1_PRO_PREVIEW } from './google/gemini-3.1-pro-preview.js';
import { MDMA_AUTHOR_PROMPT_GEMMA } from './google/gemma.js';
import { MDMA_AUTHOR_PROMPT } from './default.js';
import { MDMA_AUTHOR_PROMPT_MDMA_IL } from './mobile-reality/mdma-il.js';
import { MDMA_AUTHOR_PROMPT_GPT_4_1 } from './openai/gpt-4.1.js';
import { MDMA_AUTHOR_PROMPT_GPT_4_1_MINI } from './openai/gpt-4.1-mini.js';
import { MDMA_AUTHOR_PROMPT_GPT_4_1_NANO } from './openai/gpt-4.1-nano.js';
import { MDMA_AUTHOR_PROMPT_GPT_5 } from './openai/gpt-5.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_MINI } from './openai/gpt-5-mini.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_NANO } from './openai/gpt-5-nano.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_1 } from './openai/gpt-5.1.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_2 } from './openai/gpt-5.2.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_4 } from './openai/gpt-5.4.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_4_MINI } from './openai/gpt-5.4-mini.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_4_NANO } from './openai/gpt-5.4-nano.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_5 } from './openai/gpt-5.5.js';
import { MDMA_AUTHOR_PROMPT_GROK_4_3 } from './x-ai/grok-4.3.js';
import { MDMA_AUTHOR_PROMPT_GROK_4_20 } from './x-ai/grok-4.20.js';

export interface AuthorPromptVariant {
  /** Stable id, persisted in user settings (e.g. "default", "anthropic/haiku"). */
  id: string;
  /** Human-readable label shown in the picker. */
  label: string;
  /** Short description explaining what the variant is tuned for. */
  description: string;
  /** The prompt content to pass into `buildSystemPrompt({ authorPrompt })`. */
  prompt: string;
}

export const AUTHOR_PROMPT_VARIANTS: AuthorPromptVariant[] = [
  {
    id: 'default',
    label: 'Default',
    description:
      'Canonical prompt without any model-specific tuning. A strong generalist, but newer models may benefit from the tuned variants below.',
    prompt: MDMA_AUTHOR_PROMPT,
  },
  {
    id: 'anthropic/haiku',
    label: 'Anthropic — Claude Haiku',
    description: 'XML-tagged framing (<output_format>, <self_check>) tuned for Claude Haiku.',
    prompt: MDMA_AUTHOR_PROMPT_HAIKU,
  },
  {
    id: 'anthropic/sonnet',
    label: 'Anthropic — Claude Sonnet',
    description: 'Same Anthropic-styled framing as Haiku — placeholder for Sonnet-specific tuning.',
    prompt: MDMA_AUTHOR_PROMPT_SONNET,
  },
  {
    id: 'anthropic/opus-4.7',
    label: 'Anthropic — Claude Opus 4.7',
    description: 'Flagship Opus — Anthropic-styled framing + <scope_discipline>.',
    prompt: MDMA_AUTHOR_PROMPT_OPUS_4_7,
  },
  {
    id: 'anthropic/opus-4.6',
    label: 'Anthropic — Claude Opus 4.6',
    description:
      'Older Opus tier — same framing as opus-4.7.ts (<scope_discipline> + Anthropic wrapping).',
    prompt: MDMA_AUTHOR_PROMPT_OPUS_4_6,
  },
  {
    id: 'google/gemini-2.5-pro',
    label: 'Google — Gemini 2.5 Pro',
    description:
      'Previous-generation Pro — same Gemini-native composition as Gemini 3.1 Pro (Markdown framing, end-placed constraints).',
    prompt: MDMA_AUTHOR_PROMPT_GEMINI_2_5_PRO,
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Google — Gemini 2.5 Flash',
    description:
      'Previous-generation mid-tier Flash — all three negative-constraint blocks (fence closing + scope + select options) as defensive default.',
    prompt: MDMA_AUTHOR_PROMPT_GEMINI_2_5_FLASH,
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    label: 'Google — Gemini 2.5 Flash-Lite',
    description:
      'Previous-generation smallest-tier Flash-Lite — same defensive composition as 2.5 Flash; reserved its own file in case eval data later requires a divergent tuning.',
    prompt: MDMA_AUTHOR_PROMPT_GEMINI_2_5_FLASH_LITE,
  },
  {
    id: 'google/gemini-3.1-pro-preview',
    label: 'Google — Gemini 3.1 Pro (Preview)',
    description:
      "Gemini-native framing — Markdown headers (no XML), constraints placed at the END per Google's Gemini 3 prompting guide.",
    prompt: MDMA_AUTHOR_PROMPT_GEMINI_3_1_PRO_PREVIEW,
  },
  {
    id: 'google/gemma',
    label: 'Google — Gemma',
    description:
      "Open-weights Gemma family (Gemma 4 26B-a4b / 31B, Gemma 3n 4B). Gemini-native Markdown framing with all defensive blocks bundled (fence closing, scope discipline, string select values) for the open-model tier.",
    prompt: MDMA_AUTHOR_PROMPT_GEMMA,
  },
  {
    id: 'mobile-reality/mdma-il',
    label: 'Mobile Reality — MDMA-IL model',
    description:
      'Our self-hosted MDMA-IL DSL models (E4B mdma-v3 / 31B mdma-31b). Takes an MDMA-IL DSL intent and returns MDMA. This is the canonical v3 system prompt the models were fine-tuned with — send verbatim (a different prompt is out-of-distribution). Endpoint also requires temperature 0 + chat_template_kwargs.enable_thinking=false.',
    prompt: MDMA_AUTHOR_PROMPT_MDMA_IL,
  },
  {
    id: 'google/gemini-3.1-pro-preview-customtools',
    label: 'Google — Gemini 3.1 Pro Custom Tools (Preview)',
    description:
      'Pro tuning that prefers user-defined tools — re-exports the Pro variant since MDMA authoring does not use tool calling.',
    prompt: MDMA_AUTHOR_PROMPT_GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS,
  },
  {
    id: 'google/gemini-3-flash-preview',
    label: 'Google — Gemini 3 Flash (Preview)',
    description:
      'Mid-tier Gemini — all three negative-constraint blocks (fence closing + scope + select options) as defensive default.',
    prompt: MDMA_AUTHOR_PROMPT_GEMINI_3_FLASH_PREVIEW,
  },
  {
    id: 'google/gemini-3.1-flash-lite-preview',
    label: 'Google — Gemini 3.1 Flash-Lite (Preview)',
    description:
      'Smaller-tier Gemini — same Markdown framing as Pro plus all three negative-constraint blocks (fence closing + scope + select options).',
    prompt: MDMA_AUTHOR_PROMPT_GEMINI_3_1_FLASH_LITE_PREVIEW,
  },
  {
    id: 'openai/gpt-5',
    label: 'OpenAI — GPT-5',
    description:
      'Flagship-tier framing: <scope_discipline> + <select_options>. No <fence_closing>.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5,
  },
  {
    id: 'openai/gpt-5.5',
    label: 'OpenAI — GPT-5.5',
    description: 'Same flagship-tier framing as GPT-5: <scope_discipline> + <select_options>.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5_5,
  },
  {
    id: 'openai/gpt-5.4',
    label: 'OpenAI — GPT-5.4',
    description:
      'Adds <scope_discipline> to push back on adding components beyond what the user listed.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5_4,
  },
  {
    id: 'openai/gpt-5.2',
    label: 'OpenAI — GPT-5.2',
    description: 'Older base-tier — <scope_discipline> + <select_options>.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5_2,
  },
  {
    id: 'openai/gpt-5.1',
    label: 'OpenAI — GPT-5.1',
    description:
      'Older base-tier — same framing as GPT-5.2: <scope_discipline> + <select_options>.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5_1,
  },
  {
    id: 'openai/gpt-5-mini',
    label: 'OpenAI — GPT-5-mini',
    description:
      'Mini tier of GPT-5 — needs all three: <fence_closing> + <scope_discipline> + <select_options>.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5_MINI,
  },
  {
    id: 'openai/gpt-5-nano',
    label: 'OpenAI — GPT-5-nano',
    description: 'Smallest tier of GPT-5 — same all-three framing as GPT-5.4-nano and GPT-5-mini.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5_NANO,
  },
  {
    id: 'openai/gpt-5.4-mini',
    label: 'OpenAI — GPT-5.4-mini',
    description:
      'Adds <fence_closing> reminding the model to close ```mdma blocks before the next component.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5_4_MINI,
  },
  {
    id: 'openai/gpt-5.4-nano',
    label: 'OpenAI — GPT-5.4-nano',
    description:
      'Smallest tier — combines <fence_closing> + <scope_discipline> for maximum guidance.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5_4_NANO,
  },
  {
    id: 'openai/gpt-4.1',
    label: 'OpenAI — GPT-4.1',
    description: 'Non-reasoning flagship from the gpt-4.x family — adds <select_options>.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_4_1,
  },
  {
    id: 'openai/gpt-4.1-mini',
    label: 'OpenAI — GPT-4.1-mini',
    description:
      'Mini tier of GPT-4.1 — same framing as GPT-5.4-mini: <fence_closing> + <select_options>.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_4_1_MINI,
  },
  {
    id: 'openai/gpt-4.1-nano',
    label: 'OpenAI — GPT-4.1-nano',
    description: 'Smallest tier of GPT-4.1 — all three framing blocks for maximum guidance.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_4_1_NANO,
  },
  {
    id: 'x-ai/grok-4.3',
    label: 'xAI — Grok 4.3',
    description:
      'Minimal composition — scope_discipline + select_options only. Empirically, every additional framing block regresses Grok (see grok-4.3.ts docblock).',
    prompt: MDMA_AUTHOR_PROMPT_GROK_4_3,
  },
  {
    id: 'x-ai/grok-4.20',
    label: 'xAI — Grok 4.20',
    description:
      'Same minimal composition as Grok 4.3 — same family, no eval-driven reason to diverge yet.',
    prompt: MDMA_AUTHOR_PROMPT_GROK_4_20,
  },
];

/** Look up a variant by id. Falls back to the default variant. */
export function getAuthorPromptVariant(id: string | undefined): AuthorPromptVariant {
  if (!id) return AUTHOR_PROMPT_VARIANTS[0];
  return AUTHOR_PROMPT_VARIANTS.find((v) => v.id === id) ?? AUTHOR_PROMPT_VARIANTS[0];
}
