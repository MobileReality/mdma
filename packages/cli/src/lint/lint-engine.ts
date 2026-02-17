import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { VFile } from 'vfile';
import { remarkMdma } from '@mdma/parser';
import type { MdmaRoot } from '@mdma/spec';
import { schemaValid } from './rules/schema-valid.js';
import { uniqueIds } from './rules/unique-ids.js';
import { bindingsResolved } from './rules/bindings-resolved.js';

export interface LintDiagnostic {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  position?: { start?: { line?: number; column?: number } };
}

export interface LintResult {
  file: string;
  diagnostics: LintDiagnostic[];
  errorCount: number;
  warningCount: number;
}

export function lintSource(source: string, filePath: string): LintResult {
  const processor = unified().use(remarkParse).use(remarkMdma);
  const file = new VFile({ value: source, path: filePath });
  const tree = processor.parse(file);
  const root = processor.runSync(tree, file) as unknown as MdmaRoot;

  // Collect parser messages as diagnostics
  type Msg = (typeof file.messages)[number];
  const parserMessages = file.messages.map((m: Msg) => m.message);
  const diagnostics: LintDiagnostic[] = file.messages.map((m: Msg) => ({
    rule: 'parser',
    severity: 'error' as const,
    message: m.message,
    position: m.line ? { start: { line: m.line, column: m.column ?? 0 } } : undefined,
  }));

  // Run lint rules
  diagnostics.push(...schemaValid(root, parserMessages));
  diagnostics.push(...uniqueIds(root));
  diagnostics.push(...bindingsResolved(root));

  return {
    file: filePath,
    diagnostics,
    errorCount: diagnostics.filter((d) => d.severity === 'error').length,
    warningCount: diagnostics.filter((d) => d.severity === 'warning').length,
  };
}
