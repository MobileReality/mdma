#!/usr/bin/env node
import { Command } from 'commander';
import { lintCommand } from '../commands/lint.js';
import { scaffoldCommand } from '../commands/scaffold.js';

const program = new Command();

program
  .name('mdma')
  .description('MDMA CLI - Markdown Document Markup Architecture')
  .version('0.1.0');

program
  .command('lint')
  .description('Validate MDMA documents')
  .argument('<patterns...>', 'File patterns to lint')
  .action(async (patterns: string[]) => {
    const { exitCode } = await lintCommand(patterns);
    process.exit(exitCode);
  });

program
  .command('scaffold')
  .description('Generate a new attachable or blueprint from template')
  .argument('<type>', 'Type to scaffold: "attachable" or "blueprint"')
  .argument('[name]', 'Name for the scaffolded item')
  .action((type: string, name?: string) => {
    if (type !== 'attachable' && type !== 'blueprint') {
      console.error('Type must be "attachable" or "blueprint"');
      process.exit(1);
    }
    scaffoldCommand(type, name);
  });

program.parse();
