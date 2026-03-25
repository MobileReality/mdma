import type { ValidationRule } from '../types.js';
import { ACTION_REFERENCE_FIELDS } from '../constants.js';

export const flowOrderingRule: ValidationRule = {
  id: 'flow-ordering',
  name: 'Flow Ordering',
  description:
    'Checks that action targets reference components defined later in the document and detects circular references',
  defaultSeverity: 'info',

  validate(context) {
    // Build adjacency list for cycle detection
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

        // Build graph for cycle detection
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
  },
};
