import fs from 'node:fs';
import chalk from 'chalk';
import { globby } from 'globby';
import { validate } from '@mobile-reality/mdma-validator';
import type { ValidationIssue, ValidationResult } from '@mobile-reality/mdma-validator';

interface ValidateOptions {
  fix: boolean;
  json: boolean;
}

function severityColor(severity: string): (text: string) => string {
  switch (severity) {
    case 'error':
      return chalk.red;
    case 'warning':
      return chalk.yellow;
    case 'info':
      return chalk.blue;
    default:
      return chalk.white;
  }
}

function formatIssue(issue: ValidationIssue): string {
  const color = severityColor(issue.severity);
  const location = issue.componentId ? `[${issue.componentId}]` : `[block ${issue.blockIndex}]`;
  const field = issue.field ? `.${issue.field}` : '';
  const fixed = issue.fixed ? chalk.green(' (fixed)') : '';
  return `  ${color(issue.severity.padEnd(7))} ${chalk.dim(location + field)} ${issue.message}${fixed}`;
}

function printResult(file: string, result: ValidationResult): void {
  const status = result.ok ? chalk.green('PASS') : chalk.red('FAIL');
  console.log(`\n${status} ${chalk.bold(file)}`);

  for (const issue of result.issues) {
    console.log(formatIssue(issue));
  }

  if (result.fixCount > 0) {
    console.log(chalk.green(`  ${result.fixCount} issue(s) auto-fixed`));
  }
}

export async function validateCommand(
  patterns: string[],
  options: ValidateOptions,
): Promise<void> {
  const files = await globby(patterns, { expandDirectories: { extensions: ['md'] } });

  if (files.length === 0) {
    console.log(chalk.yellow('No files matched the given pattern(s).'));
    process.exit(0);
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalFixed = 0;
  const allResults: Record<string, ValidationResult> = {};

  for (const file of files) {
    const markdown = fs.readFileSync(file, 'utf-8');
    const result = validate(markdown, { autoFix: options.fix });

    allResults[file] = result;
    totalErrors += result.summary.errors;
    totalWarnings += result.summary.warnings;
    totalFixed += result.fixCount;

    if (options.fix && result.fixCount > 0 && result.output !== markdown) {
      fs.writeFileSync(file, result.output, 'utf-8');
    }

    if (!options.json) {
      printResult(file, result);
    }
  }

  if (options.json) {
    console.log(JSON.stringify(allResults, null, 2));
  } else {
    console.log(
      `\n${chalk.bold(`${files.length} file(s) validated`)}: ${chalk.red(`${totalErrors} errors`)}, ${chalk.yellow(`${totalWarnings} warnings`)}, ${chalk.green(`${totalFixed} fixed`)}`,
    );
  }

  if (totalErrors > 0) {
    process.exit(1);
  }
}
