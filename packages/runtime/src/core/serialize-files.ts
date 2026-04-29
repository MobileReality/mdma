/**
 * Convert any `File` instances inside a value to a JSON-safe descriptor
 * `{ name, size, type, lastModified }`. Used before the value enters the
 * audit log or redaction pipeline — `JSON.stringify(file)` yields `{}`,
 * which would otherwise erase upload metadata from the audit trail and
 * collapse hashes of sensitive file values to a constant.
 */
export function serializeFiles(value: unknown): unknown {
  if (typeof File !== 'undefined' && value instanceof File) {
    return {
      name: value.name,
      size: value.size,
      type: value.type,
      lastModified: value.lastModified,
    };
  }
  if (Array.isArray(value)) {
    return value.map(serializeFiles);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeFiles(v);
    }
    return out;
  }
  return value;
}
