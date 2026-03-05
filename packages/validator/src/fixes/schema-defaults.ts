import { componentSchemaRegistry } from '@mobile-reality/mdma-spec';
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
      c.field = undefined;
    }

    // Derive header from key when missing
    if (!c.header && !c.label && typeof c.key === 'string') {
      c.header = keyToHeader(c.key);
    }
  }
}

/** Valid form field types from the schema */
const VALID_FIELD_TYPES = new Set(['text', 'number', 'email', 'date', 'select', 'checkbox', 'textarea']);

/** Common misspellings / aliases of the `type` key */
const TYPE_KEY_TYPOS = ['typ', 'tyep', 'tpye', 'ype', 'filed_type', 'fieldType', 'field_type'];

/**
 * Infer field type from the field name when `type` is missing.
 */
function inferFieldType(name: string): string {
  const lower = name.toLowerCase().replace(/[-_]/g, '');
  if (lower.includes('email')) return 'email';
  if (lower.includes('date') || lower.includes('birthday') || lower.includes('dob')) return 'date';
  if (lower.includes('phone') || lower.includes('age') || lower.includes('amount') || lower.includes('salary') || lower.includes('price') || lower.includes('quantity') || lower.includes('count')) return 'number';
  if (lower.includes('description') || lower.includes('address') || lower.includes('comment') || lower.includes('note') || lower.includes('bio') || lower.includes('message')) return 'textarea';
  if (lower.includes('agree') || lower.includes('accept') || lower.includes('consent') || lower.includes('subscribe') || lower.includes('optIn')) return 'checkbox';
  return 'text';
}

/**
 * Pre-fix form fields: fix misspelled `type`, infer missing `type`, fill missing `label`.
 */
function patchFormFields(data: Record<string, unknown>): void {
  if (data.type !== 'form') return;
  const fields = data.fields;
  if (!Array.isArray(fields)) return;

  for (const field of fields) {
    if (typeof field !== 'object' || field === null) continue;
    const f = field as Record<string, unknown>;

    // Fix misspelled type key (e.g. "typ: date" → "type: date")
    if (!f.type || !VALID_FIELD_TYPES.has(f.type as string)) {
      for (const typo of TYPE_KEY_TYPOS) {
        if (typo in f && typeof f[typo] === 'string') {
          const val = f[typo] as string;
          if (VALID_FIELD_TYPES.has(val)) {
            f.type = val;
          }
          delete f[typo];
          break;
        }
      }
    }

    // If type is still missing, infer from field name
    if (!f.type && typeof f.name === 'string') {
      f.type = inferFieldType(f.name);
    }

    // Last resort: default to text
    if (!f.type) {
      f.type = 'text';
    }

    // If type value is not valid (e.g. misspelled value), try to match
    if (!VALID_FIELD_TYPES.has(f.type as string)) {
      const lower = (f.type as string).toLowerCase();
      for (const valid of VALID_FIELD_TYPES) {
        if (valid.startsWith(lower) || lower.startsWith(valid)) {
          f.type = valid;
          break;
        }
      }
      // Still invalid — fall back to text
      if (!VALID_FIELD_TYPES.has(f.type as string)) {
        f.type = 'text';
      }
    }

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

/**
 * Component-level properties that are Zod defaults and should be stripped
 * from the output to keep it concise. Key = property name, value = default value.
 */
const COMPONENT_DEFAULTS: Record<string, unknown> = {
  sensitive: false,
  disabled: false,
  visible: true,
};

/**
 * Per-type property defaults that are Zod defaults and should be stripped.
 */
const TYPE_DEFAULTS: Record<string, Record<string, unknown>> = {
  callout: { variant: 'info', dismissible: false },
  chart: { variant: 'line', showLegend: true, showGrid: true, height: 300, stacked: false },
  button: { variant: 'primary' },
  table: { sortable: false, filterable: false },
  thinking: { status: 'done', collapsed: true },
  webhook: { method: 'POST', retries: 0, timeout: 30000 },
  'approval-gate': { requiredApprovers: 1, requireReason: false },
};

/**
 * Strip properties that equal their Zod defaults to keep output concise.
 */
function stripDefaults(data: Record<string, unknown>): void {
  for (const [key, defaultVal] of Object.entries(COMPONENT_DEFAULTS)) {
    if (key in data && data[key] === defaultVal) {
      delete data[key];
    }
  }

  const type = data.type;
  if (typeof type === 'string' && TYPE_DEFAULTS[type]) {
    for (const [key, defaultVal] of Object.entries(TYPE_DEFAULTS[type])) {
      if (key in data && data[key] === defaultVal) {
        delete data[key];
      }
    }
  }

  // Strip default values from nested arrays (form fields, table columns)
  const fields = data.fields;
  if (Array.isArray(fields)) {
    for (const field of fields) {
      if (typeof field !== 'object' || field === null) continue;
      const f = field as Record<string, unknown>;
      if (f.required === false) f.required = undefined;
      if (f.sensitive === false) f.sensitive = undefined;
    }
  }

  const columns = data.columns;
  if (Array.isArray(columns)) {
    for (const col of columns) {
      if (typeof col !== 'object' || col === null) continue;
      const c = col as Record<string, unknown>;
      if (c.sortable === false) c.sortable = undefined;
      if (c.sensitive === false) c.sensitive = undefined;
    }
  }
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

      // Strip noisy default values that Zod added
      stripDefaults(block.data);

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
