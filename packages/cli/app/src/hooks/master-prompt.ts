/**
 * Re-export of the master prompt. This is inlined here because the web app
 * (bundled by Vite) cannot directly import from the CLI's Node.js source.
 * During build, Vite resolves this as a regular module.
 */
export { MASTER_PROMPT } from '../../../src/prompts/master-prompt.js';
