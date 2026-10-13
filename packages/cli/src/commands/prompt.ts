import fs from 'node:fs';
import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { loadDataSources } from './load-data-sources.js';

interface PromptOptions {
  dataSources?: string;
  customPrompt?: string;
}

export function buildPromptText(options: PromptOptions): string {
  return buildSystemPrompt({
    dataSources: options.dataSources ? loadDataSources(options.dataSources) : undefined,
    customPrompt: options.customPrompt ? fs.readFileSync(options.customPrompt, 'utf-8') : undefined,
  });
}

export function promptCommand(options: PromptOptions): void {
  process.stdout.write(`${buildPromptText(options)}\n`);
}
