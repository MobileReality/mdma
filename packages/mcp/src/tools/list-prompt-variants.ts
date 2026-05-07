import { AUTHOR_PROMPT_VARIANTS, type AuthorPromptVariant } from '@mobile-reality/mdma-prompt-pack';

export type PromptVariantInfo = Omit<AuthorPromptVariant, 'prompt'>;

export function listPromptVariants(): PromptVariantInfo[] {
  return AUTHOR_PROMPT_VARIANTS.map(({ id, label, description }) => ({ id, label, description }));
}
