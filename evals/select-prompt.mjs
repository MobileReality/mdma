/**
 * Master Prompt selector — picks a model-specialized variant from
 * `packages/cli/src/prompts/<family>/<model>.ts` based on EVAL_PROVIDER,
 * and falls back to the default `MASTER_PROMPT` when no variant matches.
 *
 * Convention:
 *   - <family> is the openrouter vendor segment (e.g. "anthropic", "google",
 *     "meta-llama") or the literal "openai" for `openai:*` providers.
 *   - <model>.ts is matched by substring against the actual model id, so
 *     `anthropic/haiku.ts` matches `claude-haiku-4-5`, `claude-3.5-haiku`, etc.
 *   - The variant must export `MASTER_PROMPT_<MODEL>` where <MODEL> is the
 *     filename uppercased with `-` replaced by `_` (e.g. `haiku.ts` exports
 *     `MASTER_PROMPT_HAIKU`).
 *
 * Adding a new variant: drop a file under the right family directory and
 * the selector picks it up — no registry edits, no config changes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MASTER_PROMPT } from '@mobile-reality/mdma-cli/prompts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_SRC = path.resolve(__dirname, '../packages/cli/src/prompts');

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

function discoverVariants(family) {
  const familyDir = path.join(PROMPTS_SRC, family);
  if (!fs.existsSync(familyDir)) return [];
  return fs
    .readdirSync(familyDir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts') && !f.startsWith('_'))
    .map((f) => f.replace(/\.ts$/, ''));
}

export async function selectMasterPrompt(provider = process.env.EVAL_PROVIDER) {
  if (!provider) return { prompt: MASTER_PROMPT, source: 'default (no EVAL_PROVIDER)' };

  const parsed = parseProvider(provider);
  if (!parsed) return { prompt: MASTER_PROMPT, source: `default (unrecognized provider: ${provider})` };

  const variants = discoverVariants(parsed.family);
  const modelLower = parsed.model.toLowerCase();
  // Longest substring match wins (so "claude-haiku-4-5" picks "haiku" over a hypothetical "h").
  const match = variants
    .filter((v) => modelLower.includes(v.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];

  if (!match) return { prompt: MASTER_PROMPT, source: `default (no ${parsed.family}/<*>.ts matched ${parsed.model})` };

  const modSpec = `@mobile-reality/mdma-cli/prompts/${parsed.family}/${match}`;
  const mod = await import(modSpec);
  const exportName = `MASTER_PROMPT_${match.toUpperCase().replace(/-/g, '_')}`;
  if (!mod[exportName]) {
    return { prompt: MASTER_PROMPT, source: `default (${modSpec} missing ${exportName})` };
  }
  return { prompt: mod[exportName], source: `${parsed.family}/${match}` };
}
