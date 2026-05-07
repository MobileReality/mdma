import {
  loadPrompt,
  listPrompts,
  buildSystemPrompt,
  getAuthorPromptVariant,
} from '@mobile-reality/mdma-prompt-pack';

export function getPrompt(
  name: string,
  variantId?: string,
): { content: string } | { error: string } {
  try {
    if (name === 'mdma-author') {
      const variant = getAuthorPromptVariant(variantId);
      return { content: buildSystemPrompt({ authorPrompt: variant.prompt }) };
    }
    return { content: loadPrompt(name) };
  } catch {
    const available = listPrompts();
    return {
      error: `Unknown prompt "${name}". Available prompts: ${available.join(', ')}`,
    };
  }
}
