import { componentSchemaRegistry } from '@mdma/spec';
import type { FixContext } from '../types.js';

/**
 * Capitalize a key into a human-readable header.
 * e.g. "first_name" → "First Name", "email" → "Email"
 */
function keyToHeader(key: string): string {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Pre-fix table columns: fill missing `header` from `key` (or `field`),
 * and missing `key` from `field`, so Zod parsing succeeds.
 */
function patchTableColumns(data: Record<string, unknown>): void {
  if (data.type !== 'table') return;
  const columns = data.columns;
  if (!Array.isArray(columns)) return;

  for (const col of columns) {
    if (typeof col !== 'object' || col === null) continue;
    const c = col as Record<string, unknown>;

    // Normalize field → key (mirror Zod preprocessor)
    if (typeof c.field === 'string' && !c.key) {
      c.key = c.field;
      delete c.field;
    }

    // Derive header from key when missing
    if (!c.header && !c.label && typeof c.key === 'string') {
      c.header = keyToHeader(c.key);
    }
  }
}

/**
 * Pre-fix form fields: fill missing or null `label` from `name`.
 */
function patchFormFields(data: Record<string, unknown>): void {
  if (data.type !== 'form') return;
  const fields = data.fields;
  if (!Array.isArray(fields)) return;

  for (const field of fields) {
    if (typeof field !== 'object' || field === null) continue;
    const f = field as Record<string, unknown>;

    // Derive label from name when missing or null
    if ((!f.label || f.label === null) && typeof f.name === 'string') {
      f.label = keyToHeader(f.name);
    }
  }
}

/**
 * Pre-fix table data: if `data` is a bare string that looks like a binding
 * path but isn't wrapped in {{ }}, wrap it. LLMs often generate
 * `data: personal-info.rows` instead of `data: "{{personal-info.rows}}"`.
 */
function patchTableData(data: Record<string, unknown>): void {
  if (data.type !== 'table') return;
  const d = data.data;
  if (typeof d !== 'string') return;

  // Already wrapped — nothing to do
  if (/^\{\{.+\}\}$/s.test(d)) return;

  // Looks like a binding path (e.g. "component.field" or "component")
  if (/^[a-zA-Z_][\w.-]*$/.test(d)) {
    data.data = `{{${d}}}`;
  }
}

/**
 * Pre-fix callout: fill missing or empty `content` from `title` or `id`.
 */
function patchCalloutContent(data: Record<string, unknown>): void {
  if (data.type !== 'callout') return;
  const content = data.content;
  if (typeof content === 'string' && content.trim().length > 0) return;

  // Derive from title if available
  if (typeof data.title === 'string' && data.title.trim().length > 0) {
    data.content = data.title;
    return;
  }

  // Derive from id as last resort
  if (typeof data.id === 'string') {
    data.content = keyToHeader(data.id);
    return;
  }

  // Fallback
  data.content = 'Information';
}

export function fixSchemaDefaults(context: FixContext): void {
  for (const block of context.blocks) {
    if (block.data === null) continue;
    const type = block.data.type;
    if (typeof type !== 'string') continue;

    const schema = componentSchemaRegistry.get(type);
    if (!schema) continue;

    // Patch known gaps before Zod re-parse
    patchTableColumns(block.data);
    patchTableData(block.data);
    patchFormFields(block.data);
    patchCalloutContent(block.data);

    // Re-parse with Zod to apply defaults and coercions
    const result = schema.safeParse(block.data);
    if (result.success) {
      // Replace data with the Zod-normalized version (includes defaults)
      block.data = result.data as Record<string, unknown>;

      // Mark relevant schema-conformance issues as fixed
      for (const issue of context.issues) {
        if (
          issue.ruleId === 'schema-conformance' &&
          issue.blockIndex === block.index &&
          !issue.fixed
        ) {
          // Re-check if this specific issue is now resolved
          const recheck = schema.safeParse(block.data);
          if (recheck.success) {
            issue.fixed = true;
          }
        }
      }
    }
  }
}
