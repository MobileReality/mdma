import type { FixContext } from '../types.js';

export function toKebabCase(id: string): string {
  return id
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase()
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Action handler fields that may reference other component IDs */
const ACTION_FIELDS = [
  'onSubmit',
  'onAction',
  'onComplete',
  'onApprove',
  'onDeny',
  'trigger',
];

export function fixIdFormat(context: FixContext): void {
  const idRenames = new Map<string, string>(); // old -> new

  // First pass: collect renames
  for (const issue of context.issues) {
    if (issue.ruleId !== 'id-format' || issue.fixed) continue;

    const block = context.blocks[issue.blockIndex];
    if (!block?.data) continue;

    const oldId = String(block.data.id);
    const newId = toKebabCase(oldId);

    if (newId && newId !== oldId) {
      block.data.id = newId;
      idRenames.set(oldId, newId);
      issue.fixed = true;
    }
  }

  if (idRenames.size === 0) return;

  // Second pass: update action references and bindings across all blocks
  for (const block of context.blocks) {
    if (block.data === null) continue;

    // Update action reference fields
    for (const field of ACTION_FIELDS) {
      if (typeof block.data[field] === 'string') {
        const newId = idRenames.get(block.data[field] as string);
        if (newId) {
          block.data[field] = newId;
        }
      }
    }

    // Update binding expressions that reference renamed IDs
    updateBindingsInObject(block.data, idRenames);
  }
}

function updateBindingsInObject(
  obj: Record<string, unknown>,
  renames: Map<string, string>,
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      obj[key] = replaceBindingIds(value, renames);
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] === 'string') {
          value[i] = replaceBindingIds(value[i] as string, renames);
        } else if (typeof value[i] === 'object' && value[i] !== null) {
          updateBindingsInObject(
            value[i] as Record<string, unknown>,
            renames,
          );
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      updateBindingsInObject(value as Record<string, unknown>, renames);
    }
  }
}

function replaceBindingIds(
  str: string,
  renames: Map<string, string>,
): string {
  return str.replace(
    /\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g,
    (match, path: string) => {
      const rootSegment = path.split('.')[0];
      const newId = renames.get(rootSegment);
      if (newId) {
        return `{{${newId}${path.slice(rootSegment.length)}}}`;
      }
      return match;
    },
  );
}
