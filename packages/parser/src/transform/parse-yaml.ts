import { parse as yamlParse } from 'yaml';
import type { Point } from 'unist';
import { MdmaParseError } from '../errors/parse-error.js';
import { ErrorCodes } from '../errors/error-codes.js';

export type ParseYamlResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: MdmaParseError };

export function parseYaml(
  source: string,
  position?: { start?: Point; end?: Point },
): ParseYamlResult {
  try {
    const data = yamlParse(source);
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
