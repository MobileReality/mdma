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
import { MDMA_AUTHOR_PROMPT_OPUS } from './anthropic/opus.js';
import { MDMA_AUTHOR_PROMPT_SONNET } from './anthropic/sonnet.js';
import { MDMA_AUTHOR_PROMPT } from './default.js';
import { MDMA_AUTHOR_PROMPT_GPT_5 } from './openai/gpt-5.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_2 } from './openai/gpt-5.2.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_4 } from './openai/gpt-5.4.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_4_MINI } from './openai/gpt-5.4-mini.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_4_NANO } from './openai/gpt-5.4-nano.js';
import { MDMA_AUTHOR_PROMPT_GPT_5_5 } from './openai/gpt-5.5.js';

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
    description: 'Canonical prompt. Recommended for GPT-4.x and unknown models.',
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
    id: 'anthropic/opus',
    label: 'Anthropic — Claude Opus',
    description: 'Same Anthropic-styled framing as Haiku — placeholder for Opus-specific tuning.',
    prompt: MDMA_AUTHOR_PROMPT_OPUS,
  },
  {
    id: 'openai/gpt-5',
    label: 'OpenAI — GPT-5',
    description: 'Flagship-tier framing: <scope_discipline> + <select_options>. No <fence_closing>.',
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
    description: 'Adds <scope_discipline> to push back on adding components beyond what the user listed.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5_4,
  },
  {
    id: 'openai/gpt-5.2',
    label: 'OpenAI — GPT-5.2',
    description: 'Older base-tier — same framing as GPT-5.4: <scope_discipline> only.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5_2,
  },
  {
    id: 'openai/gpt-5.4-mini',
    label: 'OpenAI — GPT-5.4-mini',
    description: 'Adds <fence_closing> reminding the model to close ```mdma blocks before the next component.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5_4_MINI,
  },
  {
    id: 'openai/gpt-5.4-nano',
    label: 'OpenAI — GPT-5.4-nano',
    description: 'Smallest tier — combines <fence_closing> + <scope_discipline> for maximum guidance.',
    prompt: MDMA_AUTHOR_PROMPT_GPT_5_4_NANO,
  },
];

/** Look up a variant by id. Falls back to the default variant. */
export function getAuthorPromptVariant(id: string | undefined): AuthorPromptVariant {
  if (!id) return AUTHOR_PROMPT_VARIANTS[0];
  return AUTHOR_PROMPT_VARIANTS.find((v) => v.id === id) ?? AUTHOR_PROMPT_VARIANTS[0];
}
