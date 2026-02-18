import { createContext, useContext } from 'react';

export interface EditableFieldContextValue {
  /** Apply one or more property changes to a form field in the underlying YAML. */
  editField: (
    componentId: string,
    fieldName: string,
    changes: Record<string, string>,
  ) => void;
  /** Available data source names (for select options switching). */
  dataSourceNames: string[];
}

const Ctx = createContext<EditableFieldContextValue | null>(null);
export const EditableFieldProvider = Ctx.Provider;

export function useEditableField() {
  return useContext(Ctx);
}

/** Extract the component ID from a field element's `id` prop (format: `${componentId}-${fieldName}`). */
export function extractComponentId(fieldId: string, fieldName: string): string {
  const suffix = `-${fieldName}`;
  return fieldId.endsWith(suffix) ? fieldId.slice(0, -suffix.length) : fieldId;
}

// ─── YAML string manipulation ────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Modify one or more properties of a specific field inside an mdma code block.
 * Handles single-line and multi-line YAML values (e.g. options arrays).
 */
export function modifyFieldInMarkdown(
  markdown: string,
  componentId: string,
  fieldName: string,
  changes: Record<string, string>,
): string {
  let result = markdown;

  for (const [property, newValue] of Object.entries(changes)) {
    result = applySingleChange(result, componentId, fieldName, property, newValue);
  }

  return result;
}

function applySingleChange(
  markdown: string,
  componentId: string,
  fieldName: string,
  property: string,
  newValue: string,
): string {
  return markdown.replace(
    /```mdma\n([\s\S]*?)```/g,
    (fullMatch, yamlBlock: string) => {
      // Only modify the block that contains our component
      if (!new RegExp(`^\\s*id:\\s*${escapeRegex(componentId)}\\s*$`, 'm').test(yamlBlock)) {
        return fullMatch;
      }

      const lines = yamlBlock.split('\n');

      // 1. Find the field's `- name: <fieldName>` line
      let fieldStart = -1;
      let fieldNameIndent = -1;
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trimStart();
        if (trimmed === `- name: ${fieldName}`) {
          fieldStart = i;
          fieldNameIndent = lines[i].length - trimmed.length;
          break;
        }
      }
      if (fieldStart === -1) return fullMatch;

      // 2. Find end of this field (next list item at same/lower indent, or end)
      let fieldEnd = lines.length;
      for (let i = fieldStart + 1; i < lines.length; i++) {
        const trimmed = lines[i].trimStart();
        if (trimmed === '') continue;
        const indent = lines[i].length - trimmed.length;
        if (indent <= fieldNameIndent) {
          fieldEnd = i;
          break;
        }
      }

      // 3. Within the field, find the property line
      const propRegex = new RegExp(`^(\\s*)${escapeRegex(property)}:`);
      for (let i = fieldStart + 1; i < fieldEnd; i++) {
        const match = lines[i].match(propRegex);
        if (match) {
          const propIndent = match[1].length;

          // Find end of this property's value (includes deeper-indented continuation lines)
          let propEnd = i + 1;
          while (propEnd < fieldEnd) {
            const nextTrimmed = lines[propEnd].trimStart();
            if (nextTrimmed === '') {
              propEnd++;
              continue;
            }
            const nextIndent = lines[propEnd].length - nextTrimmed.length;
            if (nextIndent > propIndent) {
              propEnd++;
            } else {
              break;
            }
          }

          // Replace the property (possibly multi-line) with a single line
          const newLine = match[1] + `${property}: ${newValue}`;
          lines.splice(i, propEnd - i, newLine);
          return '```mdma\n' + lines.join('\n') + '```';
        }
      }

      // 4. Property not found — add it after the `- name:` line
      const propIndent = ' '.repeat(fieldNameIndent + 2);
      lines.splice(fieldStart + 1, 0, propIndent + `${property}: ${newValue}`);
      return '```mdma\n' + lines.join('\n') + '```';
    },
  );
}
