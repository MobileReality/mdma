/**
 * Static registry of every available MDMA Agent Tool Prompt variant.
 *
 * When a new variant ships under `openai/<model>.ts` (or another vendor),
 * add a corresponding entry here so it is discoverable by consumers
 * (demo's Agent Settings picker, evals, etc.).
 */

import { MDMA_AGENT_TOOL_PROMPT } from './default.js';
import { MDMA_AGENT_TOOL_PROMPT_HAIKU_4_5 } from './anthropic/haiku-4.5.js';
import { MDMA_AGENT_TOOL_PROMPT_GEMINI_3_1_PRO_PREVIEW } from './google/gemini-3.1-pro-preview.js';
import { MDMA_AGENT_TOOL_PROMPT_GEMINI_3_FLASH_PREVIEW } from './google/gemini-3-flash-preview.js';
import { MDMA_AGENT_TOOL_PROMPT_GEMINI_3_1_FLASH_LITE_PREVIEW } from './google/gemini-3.1-flash-lite-preview.js';
import { MDMA_AGENT_TOOL_PROMPT_GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS } from './google/gemini-3.1-pro-preview-customtools.js';
import { MDMA_AGENT_TOOL_PROMPT_OPUS_4_6 } from './anthropic/opus-4.6.js';
import { MDMA_AGENT_TOOL_PROMPT_SONNET_4_6 } from './anthropic/sonnet-4.6.js';
import { MDMA_AGENT_TOOL_PROMPT_OPUS_4_7 } from './anthropic/opus-4.7.js';
import { MDMA_AGENT_TOOL_PROMPT_OPENAI } from './openai/_shared.js';
import { MDMA_AGENT_TOOL_PROMPT_GPT_5 } from './openai/gpt-5.js';
import { MDMA_AGENT_TOOL_PROMPT_GPT_5_MINI } from './openai/gpt-5-mini.js';
import { MDMA_AGENT_TOOL_PROMPT_GPT_5_1 } from './openai/gpt-5.1.js';
import { MDMA_AGENT_TOOL_PROMPT_GPT_5_2 } from './openai/gpt-5.2.js';
import { MDMA_AGENT_TOOL_PROMPT_GPT_5_4 } from './openai/gpt-5.4.js';
import { MDMA_AGENT_TOOL_PROMPT_GPT_5_4_MINI } from './openai/gpt-5.4-mini.js';
import { MDMA_AGENT_TOOL_PROMPT_GPT_5_5 } from './openai/gpt-5.5.js';

export interface AgentToolPromptVariant {
  /** Stable id — matches the author prompt variant id for automatic lookup. */
  id: string;
  /** Human-readable label shown in pickers. */
  label: string;
  /** Short description of what this variant is tuned for. */
  description: string;
  /** The prompt string to pass into `buildSystemPrompt({ customPrompt })`. */
  prompt: string;
}

export const AGENT_TOOL_PROMPT_VARIANTS: AgentToolPromptVariant[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Standard tool-use instruction. Suitable for Claude and most models.',
    prompt: MDMA_AGENT_TOOL_PROMPT,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'Conditional function-calling framing for GPT-family models (prose format).',
    prompt: MDMA_AGENT_TOOL_PROMPT_OPENAI,
  },
  {
    id: 'openai/gpt-5',
    label: 'OpenAI — GPT-5',
    description: 'Flagship non-reasoning tier — same compact prose format as gpt-5.4. Reserved for eval-driven divergence.',
    prompt: MDMA_AGENT_TOOL_PROMPT_GPT_5,
  },
  {
    id: 'openai/gpt-5.1',
    label: 'OpenAI — GPT-5.1',
    description: 'Same compact prose format as gpt-5.2 — reserved for eval-driven divergence.',
    prompt: MDMA_AGENT_TOOL_PROMPT_GPT_5_1,
  },
  {
    id: 'openai/gpt-5.2',
    label: 'OpenAI — GPT-5.2',
    description: 'Compact prose format for the gpt-5.2 base tier — same structure as gpt-5.4.',
    prompt: MDMA_AGENT_TOOL_PROMPT_GPT_5_2,
  },
  {
    id: 'openai/gpt-5.4',
    label: 'OpenAI — GPT-5.4',
    description: 'Numbered-rule format for gpt-5.4 — explicit call/no-call conditions without Markdown headers.',
    prompt: MDMA_AGENT_TOOL_PROMPT_GPT_5_4,
  },
  {
    id: 'openai/gpt-5.4-mini',
    label: 'OpenAI — GPT-5.4-mini',
    description: 'Short imperative commands for the mini tier — maximally direct to compensate for reduced instruction-following.',
    prompt: MDMA_AGENT_TOOL_PROMPT_GPT_5_4_MINI,
  },
  {
    id: 'openai/gpt-5.5',
    label: 'OpenAI — GPT-5.5',
    description: 'Decision-tree framing with Markdown headers, optimised for the GPT-5.5 reasoning model.',
    prompt: MDMA_AGENT_TOOL_PROMPT_GPT_5_5,
  },
  {
    id: 'openai/gpt-5-mini',
    label: 'OpenAI — GPT-5-mini',
    description: 'Short imperative commands for the GPT-5 mini tier — same format as gpt-5.4-mini.',
    prompt: MDMA_AGENT_TOOL_PROMPT_GPT_5_MINI,
  },
  {
    id: 'anthropic/opus-4.7',
    label: 'Anthropic — Claude Opus 4.7',
    description: 'Decision-tree framing with Markdown headers, optimised for the Claude Opus 4.7 reasoning model.',
    prompt: MDMA_AGENT_TOOL_PROMPT_OPUS_4_7,
  },
  {
    id: 'anthropic/opus-4.6',
    label: 'Anthropic — Claude Opus 4.6',
    description: 'Decision-tree framing with Markdown headers — same format as opus-4.7, reserved for eval-driven divergence.',
    prompt: MDMA_AGENT_TOOL_PROMPT_OPUS_4_6,
  },
  {
    id: 'anthropic/sonnet-4.6',
    label: 'Anthropic — Claude Sonnet 4.6',
    description: 'Decision-tree framing with Markdown headers for the Claude Sonnet 4.6 mid-tier model.',
    prompt: MDMA_AGENT_TOOL_PROMPT_SONNET_4_6,
  },
  {
    id: 'anthropic/haiku-4.5',
    label: 'Anthropic — Claude Haiku 4.5',
    description: 'Short imperative commands for the Claude Haiku lite tier — maximally direct to compensate for reduced instruction-following.',
    prompt: MDMA_AGENT_TOOL_PROMPT_HAIKU_4_5,
  },
  {
    id: 'google/gemini-3.1-pro-preview',
    label: 'Google — Gemini 3.1 Pro Preview',
    description: 'Decision-tree framing with Markdown headers, optimised for the Gemini 3.1 Pro Preview flagship model.',
    prompt: MDMA_AGENT_TOOL_PROMPT_GEMINI_3_1_PRO_PREVIEW,
  },
  {
    id: 'google/gemini-3.1-pro-preview-customtools',
    label: 'Google — Gemini 3.1 Pro Preview (custom tools)',
    description: 'Same decision-tree format as gemini-3.1-pro-preview — reserved for eval-driven divergence in the custom-tools configuration.',
    prompt: MDMA_AGENT_TOOL_PROMPT_GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS,
  },
  {
    id: 'google/gemini-3.1-flash-lite-preview',
    label: 'Google — Gemini 3.1 Flash Lite Preview',
    description: 'Short imperative commands for the Gemini Flash Lite tier — maximally direct to compensate for reduced instruction-following.',
    prompt: MDMA_AGENT_TOOL_PROMPT_GEMINI_3_1_FLASH_LITE_PREVIEW,
  },
  {
    id: 'google/gemini-3-flash-preview',
    label: 'Google — Gemini 3 Flash Preview',
    description: 'Short imperative commands for the Gemini 3 Flash tier — reserved for eval-driven divergence from the 3.1 flash variants.',
    prompt: MDMA_AGENT_TOOL_PROMPT_GEMINI_3_FLASH_PREVIEW,
  },
];

/**
 * Derive the agent tool prompt variant from the author prompt variant id.
 * Matches most-specific first (exact id), then family prefix, then default.
 */
export function getAgentToolPromptVariant(authorVariantId: string | undefined): AgentToolPromptVariant {
  if (!authorVariantId) return AGENT_TOOL_PROMPT_VARIANTS[0];
  const exact = AGENT_TOOL_PROMPT_VARIANTS.find((v) => v.id === authorVariantId);
  if (exact) return exact;
  if (authorVariantId.startsWith('openai/')) return AGENT_TOOL_PROMPT_VARIANTS[1]; // generic openai
  return AGENT_TOOL_PROMPT_VARIANTS[0];
}
