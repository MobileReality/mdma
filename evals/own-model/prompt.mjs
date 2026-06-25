import { getAuthorPromptVariant } from '@mobile-reality/mdma-prompt-pack';

/**
 * Promptfoo prompt function — MDMA-IL DSL holdout gate.
 *
 * System message = the thin `mobile-reality/mdma-il` prompt the LoRA was
 * fine-tuned with (looked up directly from the registry, decoupled from the
 * provider id). User message = the MDMA-IL DSL intent from each holdout case
 * (`vars.request`, supplied by tests-dsl.mjs).
 *
 * Both are wrapped in {% raw %} so Nunjucks passes the DSL (and any `{...}`
 * select-option braces) through verbatim.
 */
const SYSTEM_PROMPT = getAuthorPromptVariant('mobile-reality/mdma-il').prompt;

export default function ({ vars }) {
  return [
    { role: 'system', content: `{% raw %}${SYSTEM_PROMPT}{% endraw %}` },
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
