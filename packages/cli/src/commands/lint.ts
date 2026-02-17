import { readFileSync } from 'fs';
import { globby } from 'globby';
import chalk from 'chalk';
import { lintSource, type LintResult } from '../lint/lint-engine.js';

export async function lintCommand(patterns: string[]): Promise<{ results: LintResult[]; exitCode: number }> {
  const files = await globby(patterns, { expandDirectories: { extensions: ['md'] } });

  if (files.length === 0) {
    console.log(chalk.yellow('No files matched the given pattern(s).'));
    return { results: [], exitCode: 0 };
  }

  const results: LintResult[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf-8');
    const result = lintSource(source, filePath);
    results.push(result);
    totalErrors += result.errorCount;
    totalWarnings += result.warningCount;

    if (result.diagnostics.length > 0) {
      console.log(chalk.underline(filePath));
      for (const d of result.diagnostics) {
        const pos = d.position?.start
          ? `${d.position.start.line}:${d.position.start.column}`
          : '0:0';
        const sev = d.severity === 'error' ? chalk.red('error') : chalk.yellow('warning');
        console.log(`  ${pos}  ${sev}  ${d.message}  ${chalk.dim(d.rule)}`);
      }
      console.log();
    }
  }

  console.log(
    `${chalk.bold(`${files.length} file(s) linted:`)} ` +
      `${totalErrors > 0 ? chalk.red(`${totalErrors} error(s)`) : chalk.green('0 errors')}` +
      `, ${totalWarnings > 0 ? chalk.yellow(`${totalWarnings} warning(s)`) : '0 warnings'}`,
  );

  return { results, exitCode: totalErrors > 0 ? 1 : 0 };
}
