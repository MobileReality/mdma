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
import { COMPONENT_TYPES } from '@mobile-reality/mdma-spec';

const KNOWN_TYPES = new Set(COMPONENT_TYPES as readonly string[]);

/**
 * Detect YAML that looks like MDMA components but isn't inside ```mdma fences.
 * Looks for `type: <known-component>` patterns outside of fenced code blocks.
 */
function detectUnfencedComponents(markdown: string): Array<{ type: string; line: number }> {
  // Strip all fenced code blocks (any language) so we only scan prose
  const stripped = markdown.replace(/```[\s\S]*?```/g, (match) =>
    '\n'.repeat(match.split('\n').length - 1),
  );

  const results: Array<{ type: string; line: number }> = [];
  const lines = stripped.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^type:\s*(\S+)/);
    if (match && KNOWN_TYPES.has(match[1])) {
      results.push({ type: match[1], line: i + 1 });
    }
  }
  return results;
}

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

  // 0. Detect MDMA-like YAML outside of fenced blocks
  const unfenced = detectUnfencedComponents(markdown);
  const preIssues = unfenced.map((u) => ({
    ruleId: 'yaml-correctness' as ValidationRuleId,
    severity: 'error' as const,
    message: `Found "type: ${u.type}" at line ${u.line} outside of a \`\`\`mdma fenced block — wrap it in \`\`\`mdma ... \`\`\``,
    componentId: null,
    blockIndex: -1,
    fixed: false,
  }));

  // 1. Extract and parse all mdma blocks
  const blocks = extractMdmaBlocksFromMarkdown(markdown);

  // 2. Build ID map from successfully parsed blocks
  const idMap = buildIdMap(blocks);

  // 3. Run validation rules
  const context: ValidationRuleContext = {
    blocks,
    idMap,
    issues: [...preIssues],
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
      options,
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
