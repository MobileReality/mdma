export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationRuleId =
  | 'schema-conformance'
  | 'duplicate-ids'
  | 'binding-syntax'
  | 'binding-resolution'
  | 'action-references'
  | 'sensitive-flags'
  | 'required-markers'
  | 'id-format'
  | 'thinking-block'
  | 'yaml-correctness';

export interface ValidationIssue {
  /** Which rule flagged this */
  ruleId: ValidationRuleId;
  /** Error severity */
  severity: ValidationSeverity;
  /** Human-readable description of the problem */
  message: string;
  /** Component ID (if applicable, null for document-level issues) */
  componentId: string | null;
  /** Specific field path within the component */
  field?: string;
  /** Whether this issue was auto-fixed */
  fixed: boolean;
  /** Index of the mdma block in document order (0-based) */
  blockIndex: number;
}

export interface ParsedBlock {
  /** 0-based index of this block in the document */
  index: number;
  /** The raw YAML string from the fenced block */
  rawYaml: string;
  /** Parsed YAML object (null if YAML parsing failed) */
  data: Record<string, unknown> | null;
  /** Start offset in the original markdown (opening ```) */
  startOffset: number;
  /** End offset in the original markdown (after closing ```) */
  endOffset: number;
  /** Offset where YAML content begins (after ```mdma\n) */
  yamlStartOffset: number;
  /** Offset where YAML content ends (before closing ```) */
  yamlEndOffset: number;
  /** YAML parse error, if any */
  parseError?: string;
  /** Whether YAML document separators (---) were stripped to fix parsing */
  yamlSanitized?: boolean;
  /** Set when this block was split from a multi-component fenced block */
  splitFrom?: number;
}

export interface ValidationRuleContext {
  /** All parsed blocks in the document */
  blocks: ParsedBlock[];
  /** Map from component ID to block index (first occurrence) */
  idMap: Map<string, number>;
  /** Accumulator for issues */
  issues: ValidationIssue[];
  /** Options passed to validate() */
  options: ValidatorOptions;
}

export interface ValidationRule {
  /** Unique rule identifier */
  id: ValidationRuleId;
  /** Human-readable rule name */
  name: string;
  /** Brief description of what the rule checks */
  description: string;
  /** Default severity for issues from this rule */
  defaultSeverity: ValidationSeverity;
  /** Run validation, pushing issues into context.issues */
  validate(context: ValidationRuleContext): void;
}

export interface FixContext {
  /** All parsed blocks (mutable) */
  blocks: ParsedBlock[];
  /** Map from component ID to block index (may need rebuilding) */
  idMap: Map<string, number>;
  /** Issues found (fixes mark issues as fixed) */
  issues: ValidationIssue[];
}

export type FixFunction = (context: FixContext) => void;

export interface ValidatorOptions {
  /** Rule IDs to skip. Default: none (all rules run). */
  exclude?: ValidationRuleId[];
  /** Whether to apply auto-fixes. Default: true. */
  autoFix?: boolean;
  /** Custom PII field name patterns to check (in addition to defaults). */
  customPiiPatterns?: RegExp[];
}

export interface ValidationResult {
  /** true if no unfixed errors */
  ok: boolean;
  /** All issues found during validation */
  issues: ValidationIssue[];
  /** The (possibly fixed) markdown string */
  output: string;
  /** Number of issues that were auto-fixed */
  fixCount: number;
  /** Summary counts by severity (excluding fixed issues) */
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}
