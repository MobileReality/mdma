import { MDMA_AUTHOR_PROMPT } from './prompts/mdma-author.js';
import { MDMA_REVIEWER_PROMPT } from './prompts/mdma-reviewer.js';
import { MDMA_FIXER_PROMPT } from './prompts/mdma-fixer.js';

/**
 * Static registry of all available prompts.
 *
 * Prompts are stored as string constants rather than read from disk so that
 * the package works correctly after compilation to JavaScript.
 */
const PROMPTS: Record<string, string> = {
  'mdma-author': MDMA_AUTHOR_PROMPT,
  'mdma-reviewer': MDMA_REVIEWER_PROMPT,
  'mdma-fixer': MDMA_FIXER_PROMPT,
};

/**
 * Load a prompt by name.
 *
 * @param name - The prompt identifier (e.g. "mdma-author", "mdma-reviewer").
 * @returns The full prompt string.
 * @throws {Error} If the prompt name is not found in the registry.
 */
export function loadPrompt(name: string): string {
  const prompt = PROMPTS[name];
  if (prompt === undefined) {
    const available = Object.keys(PROMPTS).join(', ');
    throw new Error(`Unknown prompt "${name}". Available prompts: ${available}`);
  }
  return prompt;
}

/**
 * List all available prompt names.
 *
 * @returns An array of prompt identifiers.
 */
export function listPrompts(): string[] {
  return Object.keys(PROMPTS);
}
