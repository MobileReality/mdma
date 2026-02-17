import type { MdmaRoot, MdmaBlock } from '@mdma/spec';
import type { LintDiagnostic } from '../lint-engine.js';

export function uniqueIds(root: MdmaRoot): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  const seen = new Map<string, MdmaBlock>();

  for (const child of root.children) {
    if (isMdmaBlock(child)) {
      const id = child.component.id;
      if (seen.has(id)) {
        diagnostics.push({
          rule: 'unique-ids',
          severity: 'error',
          message: `Duplicate component ID: "${id}"`,
          position: child.position,
        });
      }
      seen.set(id, child);
    }
  }

  return diagnostics;
}

function isMdmaBlock(node: unknown): node is MdmaBlock {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: string }).type === 'mdmaBlock'
  );
}
