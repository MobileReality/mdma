import type { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { parseDataSources } from '../../src/commands/load-data-sources.js';
import { createProgram } from '../../src/program.js';

function subcommand(name: string): Command {
  const command = createProgram().commands.find((candidate) => candidate.name() === name);
  if (!command) throw new Error(`command ${name} not found`);
  return command;
}

describe.each(['prompt', 'validate'])('mdma %s --data-sources help', (name) => {
  it('declares the --data-sources option', () => {
    const option = subcommand(name).options.find(
      (candidate) => candidate.long === '--data-sources',
    );
    expect(option?.description).toContain('data-source definitions');
    expect(option?.description).toContain('kind: rows | series | options');
    expect(option?.description).toContain('columns, params');
    expect(option?.description).toContain('without data');
  });

  it('prints the file shape under --help', () => {
    const help = subcommand(name).helpInformation();
    expect(help).toContain('--data-sources <file>');
    const full = captureHelp(subcommand(name));
    expect(full).toContain('Data sources file (--data-sources):');
    expect(full).toContain('"kind": "rows"');
    expect(full).toContain('"columns"');
    expect(full).toContain('"params"');
    expect(full).toContain(
      'rows feeds table.data, series feeds chart.data, options feeds form select options',
    );
  });
});

describe('mdma prompt and validate help example', () => {
  it('shows a file shape that the loader accepts', () => {
    const full = captureHelp(subcommand('prompt'));
    const example = full.slice(full.indexOf('Data sources file'));
    const json = example.slice(example.indexOf('['), example.lastIndexOf(']') + 1);
    const sources = parseDataSources(json);
    expect(sources[0].kind).toBe('rows');
    expect(sources[0].columns?.[0].key).toBe('title');
    expect(sources[0].params?.[0].name).toBe('status');
  });
});

function captureHelp(command: Command): string {
  let output = '';
  command.configureOutput({ writeOut: (text) => (output += text) });
  command.outputHelp();
  return output;
}
