import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { selectAuthorPrompt } from './select-prompt.mjs';
import { DATA_SOURCES } from './data-sources.mjs';

/**
 * Host-registered custom components advertised to the model, mirroring what a
 * real host wires via `registerCustomComponent` + `customVariants`. Injected
 * into every author-suite system prompt so the `custom` scenarios in
 * tests.yaml have a catalog to author against. These are the ONLY valid custom
 * names — the `custom-name-in-catalog` assertion checks the model invents none.
 */
export const CUSTOM_COMPONENTS = [
  {
    name: 'signature-pad',
    description: 'Capture a hand-drawn signature and emit it as a data-URL.',
    props: 'penColor: string (CSS color), required: boolean',
    actions: ['onCapture'],
  },
  {
    name: 'map-picker',
    description: 'Pick a geographic location by dropping a pin on a map.',
    props: 'center: string ("lat,lng"), zoom: number',
    actions: ['onSelect'],
  },
];

/**
 * Promptfoo prompt function.
 *
 * Receives `context.vars` from each test case and returns an OpenAI-compatible
 * chat message array with the MDMA author system prompt + the user request.
 *
 * The system prompt contains `{{binding}}` syntax that Nunjucks would try to
 * evaluate. We wrap the entire content in {% raw %}...{% endraw %} so Nunjucks
 * passes it through verbatim — the model sees clean `{{...}}` without any
 * template artifacts.
 *
 * The author prompt is resolved from the ACTUAL provider promptfoo is calling
 * (`context.provider.id`), falling back to `EVAL_PROVIDER` only if promptfoo
 * doesn't supply one. This keeps the system prompt in sync with the model
 * even when the provider is pinned in the config's `providers:` block rather
 * than via the env var. If a model-specialized variant lives at
 * packages/prompt-pack/src/prompts/mdma-author/<family>/<model>.ts, it wins
 * over the default. Resolution is memoized per provider id and data-source flag so the selector
 * runs once per model per eval run.
 */
const promptByProvider = new Map();

function resolveAuthorPrompt(providerId, withDataSources) {
  const key = `${providerId}|${withDataSources}`;
  if (!promptByProvider.has(key)) {
    promptByProvider.set(
      key,
      selectAuthorPrompt(providerId).then(({ prompt, source }) => {
        console.error(
          `[author] system prompt: ${source} (+custom-component catalog${withDataSources ? ' and data-source catalog' : ''})`,
        );
        return buildSystemPrompt({
          authorPrompt: prompt,
          customComponents: CUSTOM_COMPONENTS,
          ...(withDataSources ? { dataSources: DATA_SOURCES } : {}),
        });
      }),
    );
  }
  return promptByProvider.get(key);
}

export default async function ({ vars, provider }) {
  const systemPrompt = await resolveAuthorPrompt(
    provider?.id ?? process.env.EVAL_PROVIDER,
    vars.dataSources === true || vars.dataSources === 'true',
  );

  return [
    { role: 'system', content: `{% raw %}${systemPrompt}{% endraw %}` },
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
