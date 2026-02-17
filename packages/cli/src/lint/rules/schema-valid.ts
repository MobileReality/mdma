import type { MdmaRoot, MdmaBlock } from '@mdma/spec';
import type { LintDiagnostic } from '../lint-engine.js';

export function schemaValid(root: MdmaRoot, _messages: string[]): LintDiagnostic[] {
  // Schema validation is done during parsing; any messages from the parser
  // are already collected. This rule checks that all mdma blocks successfully
  // produced a component (i.e., they weren't left as code blocks).
  const diagnostics: LintDiagnostic[] = [];

  for (const child of root.children) {
    if (isCodeBlock(child) && (child as { lang?: string }).lang === 'mdma') {
      diagnostics.push({
        rule: 'schema-valid',
        severity: 'error',
        message: 'MDMA block failed schema validation',
        position: child.position,
      });
    }
  }

  return diagnostics;
}

function isCodeBlock(node: unknown): boolean {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: string }).type === 'code'
  );
}
