import { loadPrompt, listPrompts } from '@mobile-reality/mdma-prompt-pack';

export function getPrompt(name: string): { content: string } | { error: string } {
  try {
    return { content: loadPrompt(name) };
  } catch {
    const available = listPrompts();
    return {
      error: `Unknown prompt "${name}". Available prompts: ${available.join(', ')}`,
    };
  }
}
