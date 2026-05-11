import { AUTHOR_PROMPT_VARIANTS } from '@mobile-reality/mdma-prompt-pack';

/**
 * Explicit model → author prompt variant mapping for models whose API ID
 * differs from the variant ID.  OpenRouter models whose value already matches
 * an author variant ID (e.g. "google/gemini-2.5-pro") don't need an entry —
 * the direct lookup in getDefaultPromptVariantForModel handles them.
 */
const MODEL_TO_PROMPT_VARIANT: Record<string, string> = {
  // Anthropic (claude-* API IDs → anthropic/* variant IDs)
  'claude-opus-4-7': 'anthropic/opus-4.7',
  'claude-opus-4-6': 'anthropic/opus-4.6',
  'claude-sonnet-4-6': 'anthropic/sonnet',
  'claude-sonnet-4-5-20250929': 'anthropic/sonnet',
  'claude-haiku-4-5-20251001': 'anthropic/haiku',
  // OpenAI (model name matches variant suffix)
  'gpt-5.5': 'openai/gpt-5.5',
  'gpt-5.5-pro': 'openai/gpt-5.5',
  'gpt-5': 'openai/gpt-5',
  'gpt-5.4': 'openai/gpt-5.4',
  'gpt-5.4-mini': 'openai/gpt-5.4-mini',
  'gpt-5.4-nano': 'openai/gpt-5.4-nano',
  'gpt-5.2': 'openai/gpt-5.2',
  'gpt-5.1': 'openai/gpt-5.1',
  'gpt-5-mini': 'openai/gpt-5-mini',
  'gpt-4.1': 'openai/gpt-4.1',
  'gpt-4.1-mini': 'openai/gpt-4.1-mini',
  'gpt-4.1-nano': 'openai/gpt-4.1-nano',
  // Google (model ID → google/* variant)
  'gemini-3.1-pro-preview': 'google/gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite-preview': 'google/gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview': 'google/gemini-3-flash-preview',
  'gemini-2.5-pro': 'google/gemini-2.5-pro',
  'gemini-2.5-flash': 'google/gemini-2.5-flash',
  'gemini-2.5-flash-lite': 'google/gemini-2.5-flash-lite',
  // xAI (model ID → x-ai/* variant)
  'grok-4.20': 'x-ai/grok-4.20',
  'grok-4.3': 'x-ai/grok-4.3',
  // OpenRouter models whose value differs from the author variant ID
  'anthropic/claude-opus-4-6': 'anthropic/opus-4.6',
  'anthropic/claude-sonnet-4-6': 'anthropic/sonnet',
};

/**
 * Returns the best-matching author prompt variant ID for a given model value.
 * Checks if the model value is itself a valid variant ID first (covers
 * OpenRouter models like "google/gemini-2.5-pro"), then the explicit mapping,
 * then falls back to "default".
 */
export function getDefaultPromptVariantForModel(model: string): string {
  if (AUTHOR_PROMPT_VARIANTS.some((v) => v.id === model)) return model;
  return MODEL_TO_PROMPT_VARIANT[model] ?? 'default';
}
