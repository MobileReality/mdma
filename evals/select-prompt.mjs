/**
 * Prompt-variant selector — picks a model-specialized variant from
 * `<promptsDir>/<family>/<model>.ts` based on EVAL_PROVIDER, and falls back
 * to a default prompt when no variant matches.
 *
 * Convention:
 *   - <family> is the openrouter vendor segment (e.g. "anthropic", "google",
 *     "meta-llama") or the literal "openai" for `openai:*` providers.
 *   - <model>.ts is matched by substring against the actual model id, so
 *     `anthropic/haiku.ts` matches `claude-haiku-4-5`, `claude-3.5-haiku`, etc.
 *   - The variant must export `<EXPORT_PREFIX>_<MODEL>` where <MODEL> is the
 *     filename uppercased with `-` replaced by `_` (e.g. `haiku.ts` exports
 *     `<EXPORT_PREFIX>_HAIKU`).
 *   - Files starting with `_` (e.g. `_shared.ts`) are skipped — reserved for
 *     internal modules shared across variants.
 *
 * Adding a new variant: drop a file under the right family directory and
 * the selector picks it up — no registry edits, no config changes.
 *
 * Two ready wrappers exposed for the evals: `selectMasterPrompt` (cli's
 * `MASTER_PROMPT`) and `selectAuthorPrompt` (prompt-pack's `MDMA_AUTHOR_PROMPT`).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MASTER_PROMPT } from '@mobile-reality/mdma-cli/prompts';
import { MDMA_AUTHOR_PROMPT } from '@mobile-reality/mdma-prompt-pack';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function parseProvider(provider) {
  if (provider.startsWith('openrouter:')) {
    const rest = provider.slice('openrouter:'.length);
    const slash = rest.indexOf('/');
    if (slash === -1) return null;
    // Strip a leading "~" from the vendor (OpenRouter routing prefix that
    // some users include) and any ":suffix" modifier from the model
    // (e.g. ":nitro", ":floor", ":free") so they don't break matching.
    const family = rest.slice(0, slash).replace(/^~/, '');
    const model = rest.slice(slash + 1).split(':')[0];
    return { family, model };
  }
  if (provider.startsWith('openai:')) {
    let rest = provider.slice('openai:'.length);
    if (rest.startsWith('chat:')) rest = rest.slice('chat:'.length);
    else if (rest.startsWith('completion:')) rest = rest.slice('completion:'.length);
    return { family: 'openai', model: rest };
  }
  return null;
}

function discoverVariants(promptsDir, family) {
  const familyDir = path.join(promptsDir, family);
  if (!fs.existsSync(familyDir)) return [];
  return fs
    .readdirSync(familyDir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts') && !f.startsWith('_'))
    .map((f) => f.replace(/\.ts$/, ''));
}

/**
 * Generic selector. Two wrappers below preset the cli vs prompt-pack lookup.
 *
 * @param {object}   opts
 * @param {string}   [opts.provider]      Provider id (defaults to EVAL_PROVIDER env)
 * @param {string}   opts.promptsDir      Absolute path to <package>/src/prompts
 * @param {string}   opts.packagePath     npm subpath prefix used for dynamic import
 * @param {string}   opts.exportPrefix    Variant export name prefix, e.g. "MASTER_PROMPT"
 * @param {string}   opts.defaultPrompt   Fallback prompt when nothing matches
 */
async function selectVariant({ provider, promptsDir, packagePath, exportPrefix, defaultPrompt }) {
  if (!provider) return { prompt: defaultPrompt, source: 'default (no EVAL_PROVIDER)' };

  const parsed = parseProvider(provider);
  if (!parsed) return { prompt: defaultPrompt, source: `default (unrecognized provider: ${provider})` };

  const variants = discoverVariants(promptsDir, parsed.family);
  const modelLower = parsed.model.toLowerCase();
  const match = variants
    .filter((v) => modelLower.includes(v.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];

  if (!match) return { prompt: defaultPrompt, source: `default (no ${parsed.family}/<*>.ts matched ${parsed.model})` };

  const modSpec = `${packagePath}/${parsed.family}/${match}`;
  const mod = await import(modSpec);
  // Normalize "-" and "." in the filename to "_" so dotted versions like
  // gpt-5.5.ts produce a valid JS identifier (MDMA_AUTHOR_PROMPT_GPT_5_5).
  const exportName = `${exportPrefix}_${match.toUpperCase().replace(/[-.]/g, '_')}`;
  if (!mod[exportName]) {
    return { prompt: defaultPrompt, source: `default (${modSpec} missing ${exportName})` };
  }
  return { prompt: mod[exportName], source: `${parsed.family}/${match}` };
}

export async function selectMasterPrompt(provider = process.env.EVAL_PROVIDER) {
  return selectVariant({
    provider,
    promptsDir: path.join(REPO_ROOT, 'packages/cli/src/prompts'),
    packagePath: '@mobile-reality/mdma-cli/prompts',
    exportPrefix: 'MASTER_PROMPT',
    defaultPrompt: MASTER_PROMPT,
  });
}

export async function selectAuthorPrompt(provider = process.env.EVAL_PROVIDER) {
  return selectVariant({
    provider,
    promptsDir: path.join(REPO_ROOT, 'packages/prompt-pack/src/prompts/mdma-author'),
    packagePath: '@mobile-reality/mdma-prompt-pack/prompts/mdma-author',
    exportPrefix: 'MDMA_AUTHOR_PROMPT',
    defaultPrompt: MDMA_AUTHOR_PROMPT,
  });
}
