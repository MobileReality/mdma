/** Environment + the prompt variant derived from it. Read once at startup. */
import { getAgentToolPromptVariant } from '@mobile-reality/mdma-prompt-pack';

export const PORT = Number(process.env.PORT ?? 8787);
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const MDMA_MODEL = process.env.MDMA_MODEL ?? 'openai/gpt-5.4-mini';

// Prompt-pack variant ids are model slugs, so the agent prompt is derived straight from the model:
// exact slug if it has a tuned variant, else the provider family, else a generic default.
export const PROMPT_VARIANT = getAgentToolPromptVariant(MDMA_MODEL);
