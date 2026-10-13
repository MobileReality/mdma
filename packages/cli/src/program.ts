import { Command } from 'commander';
import { createCommand } from './commands/create.js';
import { promptCommand } from './commands/prompt.js';
import { validateCommand } from './commands/validate.js';

export const DATA_SOURCES_FILE_FORMAT =
  'JSON array of data-source definitions (name, kind: rows | series | options, columns, params), without data';

export const DATA_SOURCES_FILE_EXAMPLE = `
Data sources file (--data-sources):
  [
    {
      "name": "incidents",
      "kind": "rows",
      "columns": [{ "key": "title", "type": "string" }],
      "params": [{ "name": "status", "type": "string", "required": true, "allowed": ["open", "closed"] }]
    }
  ]
  kind rows feeds table.data, series feeds chart.data, options feeds form select options.
`;

export function createProgram(): Command {
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
    .option(
      '--data-sources <file>',
      `${DATA_SOURCES_FILE_FORMAT}; checks { source, params } refs against it`,
    )
    .addHelpText('after', DATA_SOURCES_FILE_EXAMPLE)
    .action(validateCommand);

  program
    .command('prompt')
    .description('Print the MDMA system prompt')
    .option('--data-sources <file>', `${DATA_SOURCES_FILE_FORMAT}; lists the sources in the prompt`)
    .option('--custom-prompt <file>', 'Text file with a custom prompt to append')
    .addHelpText('after', DATA_SOURCES_FILE_EXAMPLE)
    .action(promptCommand);

  return program;
}
