import { AUTHORING_SYSTEM_PROMPT } from './authoring-system-prompt.mjs';

/**
 * Promptfoo prompt function — author suite for our model.
 *
 * DSL port of the flagship author suite (../tests.yaml): system = our shared
 * authoring system prompt (DSL grammar + rules + form/table/chart examples),
 * user = the scenario's DSL intent (`vars.request`, supplied by
 * tests-author.yaml). Output is validated against the schema + the per-case
 * structural assertions — pure DSL→MDMA generation, no customPrompt layer.
 */
export default function ({ vars }) {
  return [
    { role: 'system', content: `{% raw %}${AUTHORING_SYSTEM_PROMPT}{% endraw %}` },
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
