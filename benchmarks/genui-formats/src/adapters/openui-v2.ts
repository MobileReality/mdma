/**
 * OpenUI Lang, generated from the SHIPPED library rather than their pinned
 * benchmark artifact.
 *
 * Why this exists. The `openui` arm uses `vendor/openui-system-prompt.txt`,
 * the file thesysdev publish in their own `benchmarks/` directory. It is
 * byte-identical to their repo today, but it is stale relative to the library
 * they ship on npm: `openuiLibrary.prompt()` from `@openuidev/react-ui@0.13.5`
 * produces a materially different prompt.
 *
 *   pinned benchmarks/system-prompt.txt   13,080 chars, has `## Examples`
 *   openuiLibrary.prompt() @ 0.13.5       17,431 chars, no `## Examples`,
 *                                         adds `## Action - Button Behavior`,
 *                                         `## Final Verification`, and the
 *                                         Modal and Action components
 *
 * An integrator who installs the package today gets the second one, so this
 * arm measures what they would actually experience.
 *
 * The schema is regenerated from the SAME library version via
 * `toJSONSchema()`. That pairing matters: the pinned schema has no Modal or
 * Action, so validating 0.13.5 output against it would report unknown-component
 * failures that are an artifact of our mismatch, not of the model.
 *
 * Validation logic is otherwise identical to the `openui` arm and is reused
 * from it, so any difference in score comes from the prompt and schema alone.
 *
 * Prompt and schema are generated, not committed. Regenerate with:
 *   node -e "import('@openuidev/react-ui').then(m=>{require('fs')
 *     .writeFileSync('vendor/openui-prompt-v0.13.5.txt', m.openuiLibrary.prompt())})"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createParser } from '@openuidev/lang-core';
import { validateWithParser } from './openui.js';
import type { FormatAdapter, ValidationResult } from './types.js';

const VENDOR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'vendor');
const PROMPT_FILE = join(VENDOR, 'openui-prompt-v0.13.5.txt');
const SCHEMA_FILE = join(VENDOR, 'openui-schema-0.13.5.json');

const SYSTEM_PROMPT = existsSync(PROMPT_FILE) ? readFileSync(PROMPT_FILE, 'utf8') : '';
const parser = existsSync(SCHEMA_FILE)
  ? createParser(JSON.parse(readFileSync(SCHEMA_FILE, 'utf8')))
  : null;

export const openuiV2Adapter: FormatAdapter = {
  id: 'openui-v2',
  label: 'OpenUI Lang',
  promptSource: 'openuiLibrary.prompt() from @openuidev/react-ui@0.13.5',

  async systemPrompt(): Promise<string> {
    if (!SYSTEM_PROMPT) {
      throw new Error(`missing ${PROMPT_FILE} - regenerate from @openuidev/react-ui`);
    }
    return SYSTEM_PROMPT;
  },

  validate(output: string): ValidationResult {
    if (!parser) throw new Error(`missing ${SCHEMA_FILE} - regenerate from @openuidev/react-ui`);
    return validateWithParser(output, parser);
  },
};
