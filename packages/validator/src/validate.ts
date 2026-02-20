import type {
  ValidatorOptions,
  ValidationResult,
  ValidationRuleContext,
  FixContext,
  ParsedBlock,
  ValidationRuleId,
} from './types.js';
import { extractMdmaBlocksFromMarkdown } from './extract-blocks.js';
import { getRulesExcluding } from './rules/index.js';
import { FIX_REGISTRY, FIX_ORDER } from './fixes/index.js';
import { reconstructMarkdown } from './reserialize.js';

function buildIdMap(blocks: ParsedBlock[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const block of blocks) {
    if (block.data && typeof block.data.id === 'string') {
      if (!map.has(block.data.id)) {
        map.set(block.data.id, block.index);
      }
    }
  }
  return map;
}

export function validate(
  markdown: string,
  options: ValidatorOptions = {},
): ValidationResult {
  const { exclude = [], autoFix = true } = options;

  // 1. Extract and parse all mdma blocks
  const blocks = extractMdmaBlocksFromMarkdown(markdown);

  // 2. Build ID map from successfully parsed blocks
  const idMap = buildIdMap(blocks);

  // 3. Run validation rules
  const context: ValidationRuleContext = {
    blocks,
    idMap,
    issues: [],
    options,
  };
  const rules = getRulesExcluding(exclude);
  for (const rule of rules) {
    rule.validate(context);
  }

  // 4. Apply auto-fixes (if enabled)
  let fixCount = 0;
  if (autoFix) {
    const fixContext: FixContext = {
      blocks,
      idMap,
      issues: context.issues,
    };

    for (const ruleId of FIX_ORDER) {
      if (exclude.includes(ruleId as ValidationRuleId)) continue;
      const fix = FIX_REGISTRY[ruleId];
      if (fix) {
        fix(fixContext);
      }
    }

    fixCount = context.issues.filter((i) => i.fixed).length;

    // Rebuild idMap after fixes
    fixContext.idMap = buildIdMap(blocks);
  }

  // 5. Reconstruct output markdown
  const output = autoFix ? reconstructMarkdown(markdown, blocks) : markdown;

  // 6. Build result
  const unfixedIssues = context.issues.filter((i) => !i.fixed);
  const errors = unfixedIssues.filter(
    (i) => i.severity === 'error',
  ).length;
  const warnings = unfixedIssues.filter(
    (i) => i.severity === 'warning',
  ).length;
  const infos = unfixedIssues.filter(
    (i) => i.severity === 'info',
  ).length;

  return {
    ok: errors === 0,
    issues: context.issues,
    output,
    fixCount,
    summary: { errors, warnings, infos },
  };
}
