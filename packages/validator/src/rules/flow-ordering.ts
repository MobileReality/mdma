import type { ValidationRule } from '../types.js';
import { ACTION_REFERENCE_FIELDS } from '../constants.js';

/** Component types that produce user interactions triggering the next step. */
const INTERACTIVE_TYPES = new Set(['form', 'button', 'tasklist', 'approval-gate']);

export const flowOrderingRule: ValidationRule = {
  id: 'flow-ordering',
  name: 'Flow Ordering',
  description:
    'Checks that action targets reference components defined later in the document, detects circular references, and flags multi-step flows that should be split across messages',
  defaultSeverity: 'warning',

  validate(context) {
    // Build adjacency list for cycle and chain detection
    const graph = new Map<string, string[]>();

    for (const block of context.blocks) {
      if (block.data === null) continue;

      const type = block.data.type;
      if (typeof type !== 'string') continue;

      const sourceId =
        typeof block.data.id === 'string' ? block.data.id : null;

      const fields = ACTION_REFERENCE_FIELDS[type];
      if (!fields) continue;

      for (const field of fields) {
        const targetId = block.data[field];
        if (typeof targetId !== 'string') continue;

        // Only check targets that are known component IDs
        const targetIndex = context.idMap.get(targetId);
        if (targetIndex === undefined) continue;

        // Check forward reference: target should be defined after source
        if (targetIndex <= block.index) {
          context.issues.push({
            ruleId: 'flow-ordering',
            severity: 'info',
            message: `Action target "${targetId}" in ${field} is defined before the referencing component (backward reference)`,
            componentId: sourceId,
            field,
            blockIndex: block.index,
            fixed: false,
          });
        }

        // Build graph for cycle and chain detection
        if (sourceId) {
          if (!graph.has(sourceId)) graph.set(sourceId, []);
          graph.get(sourceId)!.push(targetId);
        }
      }
    }

    // Detect cycles via DFS
    const visited = new Set<string>();
    const inStack = new Set<string>();

    function dfs(node: string, path: string[]): string[] | null {
      if (inStack.has(node)) {
        const cycleStart = path.indexOf(node);
        return path.slice(cycleStart).concat(node);
      }
      if (visited.has(node)) return null;

      visited.add(node);
      inStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) ?? [];
      for (const neighbor of neighbors) {
        const cycle = dfs(neighbor, path);
        if (cycle) return cycle;
      }

      path.pop();
      inStack.delete(node);
      return null;
    }

    const reportedCycles = new Set<string>();
    for (const node of graph.keys()) {
      if (visited.has(node)) continue;
      const cycle = dfs(node, []);
      if (cycle) {
        const cycleKey = [...cycle].sort().join(',');
        if (!reportedCycles.has(cycleKey)) {
          reportedCycles.add(cycleKey);
          context.issues.push({
            ruleId: 'flow-ordering',
            severity: 'info',
            message: `Circular reference detected: ${cycle.join(' → ')}`,
            componentId: cycle[0],
            blockIndex: context.idMap.get(cycle[0]) ?? 0,
            fixed: false,
          });
        }
      }
    }

    // Detect regenerated components from prior conversation turns.
    // If the caller provides priorComponentIds, any component in the current
    // message that reuses one of those IDs is a sign the LLM repeated a
    // previous step instead of advancing to the next one.
    const priorIds = context.options.priorComponentIds;
    if (priorIds && priorIds.length > 0) {
      const priorSet = new Set(priorIds);
      for (const block of context.blocks) {
        if (block.data === null) continue;
        const id = block.data.id;
        if (typeof id !== 'string') continue;
        const type = block.data.type;
        if (typeof type !== 'string') continue;
        // Only flag interactive components — callouts/webhooks may legitimately repeat
        if (!INTERACTIVE_TYPES.has(type)) continue;

        if (priorSet.has(id)) {
          context.issues.push({
            ruleId: 'flow-ordering',
            severity: 'error',
            message: `Component "${id}" (${type}) was already shown in a previous message — the LLM should generate the next step, not repeat a prior one`,
            componentId: id,
            blockIndex: block.index,
            fixed: false,
          });
        }
      }
    }

    // Detect multi-step flows in a single document.
    //
    // Check 1: If an interactive component targets another interactive
    // component via action fields, it's an explicit multi-step chain.
    //
    // Check 2: If a document contains multiple interactive components of
    // different types (e.g. form + approval-gate), they represent different
    // workflow stages and should be in separate messages — even without
    // explicit action chains between them. Exception: form + button is OK
    // since buttons often accompany forms in the same step.
    const interactiveBlocks: Array<{ id: string; type: string; index: number }> = [];

    for (const block of context.blocks) {
      if (block.data === null) continue;
      const type = block.data.type;
      if (typeof type !== 'string') continue;
      if (!INTERACTIVE_TYPES.has(type)) continue;

      const sourceId =
        typeof block.data.id === 'string' ? block.data.id : null;

      interactiveBlocks.push({
        id: sourceId ?? `block-${block.index}`,
        type,
        index: block.index,
      });

      // Check 1: explicit action chain to another interactive component
      const fields = ACTION_REFERENCE_FIELDS[type];
      if (!fields) continue;

      for (const field of fields) {
        const targetId = block.data[field];
        if (typeof targetId !== 'string') continue;

        const targetIndex = context.idMap.get(targetId);
        if (targetIndex === undefined) continue;

        const targetBlock = context.blocks[targetIndex];
        if (!targetBlock?.data) continue;

        const targetType = targetBlock.data.type;
        if (typeof targetType !== 'string') continue;

        // form ↔ button is OK (button accompanies form in the same step)
        const isFormButtonPair =
          (type === 'button' && targetType === 'form') ||
          (type === 'form' && targetType === 'button');
        if (INTERACTIVE_TYPES.has(targetType) && !isFormButtonPair) {
          context.issues.push({
            ruleId: 'flow-ordering',
            severity: 'error',
            message: `Multi-step flow in single message: "${sourceId}" (${type}) targets "${targetId}" (${targetType}) via ${field} — each step should be a separate conversation turn`,
            componentId: sourceId,
            field,
            blockIndex: block.index,
            fixed: false,
          });
        }
      }
    }

    // Check 2: multiple interactive types in one document
    // form + button in the same message is fine (button accompanies form).
    // But form + approval-gate, form + tasklist, etc. = different stages.
    if (interactiveBlocks.length > 1) {
      const types = new Set(interactiveBlocks.map((b) => b.type));
      const isJustFormAndButton =
        types.size <= 2 && types.has('form') && types.has('button');

      if (!isJustFormAndButton && types.size > 1) {
        const typeList = [...types].join(', ');
        context.issues.push({
          ruleId: 'flow-ordering',
          severity: 'error',
          message: `Multiple interactive component types in single message (${typeList}) — each workflow stage should be a separate conversation turn`,
          componentId: null,
          blockIndex: interactiveBlocks[0].index,
          fixed: false,
        });
      }
    }
  },
};
