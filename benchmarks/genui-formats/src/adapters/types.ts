/**
 * A format under test. Each adapter owns two things and nothing else:
 *
 *   1. the system prompt, obtained from that format's OWN published artifact or
 *      official prompt-generation API — never hand-written by us
 *   2. the validator, which answers "could a renderer for this format actually
 *      render what the model produced?"
 *
 * Everything else (scenarios, model calls, scoring) is shared, so the only
 * variable between formats is the format itself.
 */

/** Categories are shared across formats so the failure taxonomy is comparable. */
export type FailureKind =
  /** output was not parseable at all (bad JSON / bad YAML / unparseable DSL) */
  | 'parse-error'
  /** parsed, but violates the format's schema (missing required prop, bad enum) */
  | 'schema-error'
  /** references a component the catalog does not define */
  | 'unknown-component'
  /** an id/reference that does not resolve, or a dangling child */
  | 'broken-reference'
  /** the structured payload is absent — model answered in prose or raw markdown */
  | 'no-structured-output'
  /** model wrapped or interleaved the payload with commentary it should not have */
  | 'prose-leakage'
  /** output ended mid-structure (hit max_tokens) */
  | 'truncated'
  /** model declined or answered something else entirely */
  | 'off-task';

export interface ValidationIssue {
  kind: FailureKind;
  message: string;
  /**
   * The output still renders, but loses something (a dropped surplus prop, a
   * code fence around otherwise-valid payload). Recorded for the report but not
   * counted as a failure.
   *
   * The line between `degraded` and fatal is held to one standard across all
   * four formats: fatal means the renderer produces something broken, blank, or
   * missing; degraded means it renders with a cosmetic loss.
   */
  degraded?: boolean;
}

export interface ValidationResult {
  /** true only if a renderer for this format could render this output as-is */
  ok: boolean;
  issues: ValidationIssue[];
  /**
   * A stable structural fingerprint of the rendered result — component types
   * and their arity, with all content stripped. Used to measure whether repeats
   * of the same prompt produce the *same shape*, not just valid output.
   * Undefined when the output did not parse.
   */
  shape?: string;
  /** Number of renderable components found, for sanity-checking empty passes. */
  componentCount?: number;
}

export interface FormatAdapter {
  id: 'mdma' | 'openui' | 'json-render' | 'agenui' | 'a2ui';
  /** Display name used in report tables. */
  label: string;
  /** Where the system prompt came from — printed in the report for auditability. */
  promptSource: string;
  /**
   * The system prompt for this format. `model` is passed because MDMA ships
   * per-model prompt variants and using the default for every model would
   * benchmark MDMA as no integrator actually uses it.
   */
  systemPrompt(model: string): Promise<string>;
  validate(output: string): ValidationResult;
}
