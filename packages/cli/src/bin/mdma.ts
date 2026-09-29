#!/usr/bin/env node
import { Command } from 'commander';
import { createCommand } from '../commands/create.js';
import { promptCommand } from '../commands/prompt.js';
import { validateCommand } from '../commands/validate.js';

const program = new Command();

program
  .name('mdma')
  .version('0.1.0')
  .description('MDMA CLI — prompt builder and document validator');

program
  .command('create', { isDefault: true })
  .description('Open the prompt builder web app')
  .option('-p, --port <port>', 'Port to run the web app on')
  .action(createCommand);

program
  .command('validate <patterns...>')
  .description('Validate MDMA document(s)')
  .option('--fix', 'Apply auto-fixes', true)
  .option('--no-fix', 'Disable auto-fixes')
  .option('--json', 'Output results as JSON', false)
  .option('--data-sources <file>', 'JSON file with a data-source catalog to validate refs against')
  .action(validateCommand);

program
  .command('prompt')
  .description('Print the MDMA system prompt')
  .option('--data-sources <file>', 'JSON file with a data-source catalog to include in the prompt')
  .option('--custom-prompt <file>', 'Text file with a custom prompt to append')
  .action(promptCommand);

program.parse();
