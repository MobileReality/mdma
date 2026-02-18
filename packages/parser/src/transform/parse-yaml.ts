import { parse as yamlParse } from 'yaml';
import type { Point } from 'unist';
import { MdmaParseError } from '../errors/parse-error.js';
import { ErrorCodes } from '../errors/error-codes.js';

export type ParseYamlResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: MdmaParseError };

/**
 * Auto-quote plain scalar values that contain ": " (colon-space) — a common
 * issue with AI-generated YAML where values like `label: Example: Revenue`
 * are interpreted as nested mappings instead of a simple string value.
 *
 * Only affects simple `key: value` lines (not block scalars, sequences, etc.).
 */
function sanitizeYaml(source: string): string {
  const lines = source.split('\n');
  let inBlockScalar = false;
  let blockIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track block scalar context (lines after `key: |` or `key: >`)
    if (inBlockScalar) {
      // Block scalar ends when we encounter a line with ≤ blockIndent
      const indent = line.search(/\S/);
      if (indent >= 0 && indent <= blockIndent) {
        inBlockScalar = false;
      } else {
        continue; // Inside block scalar, don't touch
      }
    }

    // Detect block scalar start: `key: |` or `key: >`
    if (/^\s*[\w-]+:\s*[|>]\s*$/.test(line)) {
      inBlockScalar = true;
      blockIndent = line.search(/\S/);
      continue;
    }

    // Skip lines that are not simple key-value pairs (sequences, comments, etc.)
    const kvMatch = line.match(/^(\s*)([\w-]+):\s+(.+)$/);
    if (!kvMatch) continue;

    const [, indent, , value] = kvMatch;
    // Skip if value is already quoted, is a flow sequence/mapping, boolean, null, or number
    if (/^["']/.test(value)) continue;
    if (/^[[\]{]/.test(value)) continue;
    if (/^(true|false|null|~)$/i.test(value)) continue;
    if (/^-?\d+(\.\d+)?$/.test(value)) continue;
    // Skip sequence items (e.g. `  - item`)
    if (indent && /^\s*-/.test(line)) continue;

    // If the value contains ": " (colon-space), quote it
    if (value.includes(': ')) {
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      lines[i] = line.replace(/:\s+.+$/, `: "${escaped}"`);
    }
  }

  return lines.join('\n');
}

export function parseYaml(
  source: string,
  position?: { start?: Point; end?: Point },
): ParseYamlResult {
  try {
    const data = yamlParse(sanitizeYaml(source));
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return {
        ok: false,
        error: new MdmaParseError(
          'MDMA block must contain a YAML mapping (object)',
          ErrorCodes.YAML_PARSE_ERROR,
          position,
        ),
      };
    }
    return { ok: true, data: data as Record<string, unknown> };
  } catch (err) {
    return {
      ok: false,
      error: new MdmaParseError(
        `YAML parse error: ${err instanceof Error ? err.message : String(err)}`,
        ErrorCodes.YAML_PARSE_ERROR,
        position,
      ),
    };
  }
}
