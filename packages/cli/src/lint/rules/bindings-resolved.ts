import type { MdmaRoot } from '@mdma/spec';
import { buildBindingGraph } from '@mdma/parser';
import type { LintDiagnostic } from '../lint-engine.js';

export function bindingsResolved(root: MdmaRoot): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  const graph = buildBindingGraph(root);

  // Collect all "provided" binding names from form fields
  const providedBindings = new Set<string>();
  for (const child of root.children) {
    if (isMdmaBlock(child) && child.component.type === 'form') {
      for (const field of (child.component as { fields: Array<{ name: string }> }).fields) {
        providedBindings.add(field.name);
      }
    }
  }

  // Check that each binding reference resolves to something
  for (const ref of graph.bindings) {
    // Skip bindings that reference form fields or component-scoped paths
    if (providedBindings.has(ref.path)) continue;
    if (ref.path.includes('.')) continue; // Nested paths may be runtime-resolved

    diagnostics.push({
      rule: 'bindings-resolved',
      severity: 'warning',
      message: `Binding "{{${ref.path}}}" in component "${ref.componentId}" may not resolve to any form field`,
    });
  }

  return diagnostics;
}

function isMdmaBlock(node: unknown): node is import('@mdma/spec').MdmaBlock {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: string }).type === 'mdmaBlock'
  );
}
