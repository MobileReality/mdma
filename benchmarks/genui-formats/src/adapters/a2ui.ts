/**
 * A2UI / AGenUI adapter.
 *
 * Prompt — and this is itself a finding worth stating in the report: A2UI does
 * NOT ship an injectable system prompt. It ships an *Agent Skill*: a `SKILL.md`
 * with progressive disclosure that instructs a file-reading agent to load
 * `reference/*.md` on demand. Pasted into a plain system prompt, `SKILL.md`
 * alone tells the model to read files it cannot read.
 *
 * So we flatten it: `SKILL.md` plus the reference documents its own routing
 * table marks as *required* for "Non-DTO Component" mode — the mode our
 * scenarios fall into (no DTO supplied, component/card requested). That is
 * `component-catalog.md` and `component-design.md`, plus `data-binding.md`
 * which the binding rules are unusable without. The agent-workflow sections
 * (validation scripts, iteration-by-diff) are left in place rather than edited
 * out, so the prompt stays theirs.
 *
 * Validator: structural conformance to the A2UI v0.9 message shape documented
 * in `reference/component-catalog.md` and `reference/data-binding.md`, with the
 * component vocabulary taken from the shipped `agenui_catalog.json`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FormatAdapter, ValidationIssue, ValidationResult } from './types.js';

const VENDOR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'vendor');
const REF = join(VENDOR, 'a2ui-reference');

const read = (p: string) => readFileSync(p, 'utf8');

/** Required docs for Mode 2 (Non-DTO Component), per SKILL.md's own routing table. */
const FLATTENED_PROMPT = [
  read(join(VENDOR, 'a2ui-SKILL.md')),
  '\n\n---\n\n# reference/component-catalog.md\n\n',
  read(join(REF, 'component-catalog.md')),
  '\n\n---\n\n# reference/component-design.md\n\n',
  read(join(REF, 'component-design.md')),
  '\n\n---\n\n# reference/data-binding.md\n\n',
  read(join(REF, 'data-binding.md')),
  [
    '\n\n---\n\n# Output channel',
    '',
    'You are being called through a plain chat completion, not through a file-editing',
    'agent. You cannot read files or run scripts. Emit the deliverables directly in your',
    'reply as JSON: the `updateComponents` message first, then the `updateDataModel`',
    'message, in that order.',
    '',
  ].join('\n'),
].join('');

const CATALOG = JSON.parse(read(join(VENDOR, 'agenui_catalog.json')));

/**
 * Component names the shipped catalog defines. `agenui_catalog.json` keys them
 * under a top-level `components` object (25 of them: 18 A2UI standard + 4 SDK
 * extensions + 3 playground examples).
 */
function catalogComponents(): Set<string> {
  const components = CATALOG?.components;
  if (!components || typeof components !== 'object') {
    throw new Error('agenui_catalog.json has no `components` object — vendored file is wrong');
  }
  return new Set(Object.keys(components));
}

const KNOWN_COMPONENTS = catalogComponents();

interface A2uiComponent {
  id?: string;
  component?: string;
  children?: unknown;
  child?: unknown;
  tabs?: unknown;
}

/** Pull every top-level JSON object out of a response that may also contain prose. */
function extractJsonObjects(output: string): { objects: unknown[]; prose: boolean } {
  const objects: unknown[] = [];
  let prose = false;

  // Prefer fenced blocks — the skill's examples are all fenced JSON.
  const fences = [...output.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  const candidates = fences.length > 0 ? fences : [output];
  if (fences.length > 0) {
    const stripped = output.replace(/```(?:json)?\s*\n[\s\S]*?```/g, '').trim();
    prose = stripped.length > 200;
  }

  for (const chunk of candidates) {
    // Scan for balanced top-level objects so several messages in one block work.
    let depth = 0;
    let start = -1;
    let inString = false;
    let escaped = false;
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{') {
        if (depth === 0) start = i;
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          try {
            objects.push(JSON.parse(chunk.slice(start, i + 1)));
          } catch {
            /* not a complete object — ignore */
          }
          start = -1;
        }
      }
    }
  }

  return { objects, prose };
}

function collectRefs(comp: A2uiComponent): string[] {
  const refs: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === 'string') refs.push(v);
  };
  if (Array.isArray(comp.children)) comp.children.forEach(push);
  // Template binding form: { path, componentId }
  else if (comp.children && typeof comp.children === 'object') {
    push((comp.children as { componentId?: unknown }).componentId);
  }
  push(comp.child);
  if (Array.isArray(comp.tabs)) {
    for (const tab of comp.tabs) push((tab as { child?: unknown })?.child);
  }
  return refs;
}

/** Every binding path in the tree, for the dot-notation rule. */
function collectPaths(node: unknown, acc: string[] = [], depth = 0): string[] {
  if (!node || typeof node !== 'object' || depth > 20) return acc;
  const n = node as Record<string, unknown>;
  if (typeof n.path === 'string') acc.push(n.path);
  for (const v of Object.values(n)) {
    if (Array.isArray(v)) for (const x of v) collectPaths(x, acc, depth + 1);
    else if (v && typeof v === 'object') collectPaths(v, acc, depth + 1);
  }
  return acc;
}

export const a2uiAdapter: FormatAdapter = {
  id: 'a2ui',
  label: 'A2UI (AGenUI)',
  promptSource: 'flattened skills/a2ui-generation SKILL.md + required refs (AGenUI @ 3e79bea)',

  async systemPrompt(): Promise<string> {
    return FLATTENED_PROMPT;
  },

  validate(output: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { objects, prose } = extractJsonObjects(output);

    if (objects.length === 0) {
      // The skill opens with a mode-selection workflow (DTO component /
      // non-DTO component / non-DTO page). Models frequently answer it by
      // asking which mode to use, or by asking for a DTO, instead of
      // generating anything. That is a different failure from malformed
      // output and worth separating in the taxonomy.
      const askedBack =
        /please (specify|provide|clarify)|which (mode|option)|could you (clarify|provide)|my specialized role/i.test(
          output,
        );
      issues.push({
        kind: askedBack ? 'off-task' : 'no-structured-output',
        message: askedBack
          ? 'model asked for mode/DTO clarification instead of generating'
          : 'no parseable JSON object found in the response',
      });
      return { ok: false, issues, componentCount: 0 };
    }

    // updateComponents may arrive as its own message or nested in a wrapper.
    let updateComponents: { surfaceId?: string; components?: unknown } | undefined;
    let updateDataModel: { path?: string; value?: unknown } | undefined;

    for (const obj of objects) {
      const o = obj as Record<string, unknown>;
      if (o.updateComponents && typeof o.updateComponents === 'object') {
        updateComponents = o.updateComponents as typeof updateComponents;
      }
      if (o.updateDataModel && typeof o.updateDataModel === 'object') {
        updateDataModel = o.updateDataModel as typeof updateDataModel;
      }
      // Bare form: the object *is* the updateComponents payload.
      if (!updateComponents && Array.isArray(o.components)) {
        updateComponents = o as typeof updateComponents;
      }
    }

    if (!updateComponents) {
      issues.push({
        kind: 'no-structured-output',
        message: 'response contains JSON but no updateComponents message',
      });
      return { ok: false, issues, componentCount: 0 };
    }

    const components = updateComponents.components;
    if (!Array.isArray(components) || components.length === 0) {
      issues.push({ kind: 'schema-error', message: 'updateComponents.components is not a non-empty array' });
      return { ok: false, issues, componentCount: 0 };
    }

    const list = components as A2uiComponent[];
    const ids = new Set<string>();
    for (const comp of list) {
      if (!comp || typeof comp !== 'object') {
        issues.push({ kind: 'schema-error', message: 'components[] contains a non-object entry' });
        continue;
      }
      if (typeof comp.id !== 'string' || !comp.id) {
        issues.push({ kind: 'schema-error', message: 'a component is missing a string `id`' });
        continue;
      }
      if (ids.has(comp.id)) {
        issues.push({ kind: 'broken-reference', message: `duplicate component id "${comp.id}"` });
      }
      ids.add(comp.id);

      if (typeof comp.component !== 'string') {
        issues.push({
          kind: 'schema-error',
          message: `component "${comp.id}" is missing a string \`component\` type`,
        });
      } else if (KNOWN_COMPONENTS.size > 0 && !KNOWN_COMPONENTS.has(comp.component)) {
        issues.push({
          kind: 'unknown-component',
          message: `"${comp.component}" is not in agenui_catalog.json`,
        });
      }
    }

    // A2UI resolves the tree from a root id; unresolved refs render nothing.
    for (const comp of list) {
      if (!comp?.id) continue;
      for (const ref of collectRefs(comp)) {
        if (!ids.has(ref)) {
          issues.push({
            kind: 'broken-reference',
            message: `component "${comp.id}" references missing component "${ref}"`,
          });
        }
      }
    }

    // Binding-path rules, straight from reference/data-binding.md:
    // absolute paths start with "/", dot notation is explicitly an error.
    for (const p of collectPaths(updateComponents)) {
      if (p.includes('.')) {
        issues.push({
          kind: 'schema-error',
          message: `binding path "${p}" uses dot notation (data-binding.md forbids it)`,
        });
      }
    }
    if (updateDataModel && typeof updateDataModel.path === 'string') {
      if (!updateDataModel.path.startsWith('/')) {
        issues.push({
          kind: 'schema-error',
          message: `updateDataModel.path "${updateDataModel.path}" must start with "/"`,
        });
      }
    }

    // Components bound to data with no data model shipped render blank.
    const bound = collectPaths(updateComponents).filter((p) => p.startsWith('/'));
    if (bound.length > 0 && !updateDataModel) {
      issues.push({
        kind: 'broken-reference',
        message: `${bound.length} binding path(s) but no updateDataModel message — renders blank`,
      });
    }

    if (prose) {
      issues.push({
        kind: 'prose-leakage',
        message: 'substantial prose accompanied the JSON payloads',
      });
    }

    const shape = list.map((c) => c.component ?? '?').join(',');
    const fatal = issues.filter((i) => !i.degraded && i.kind !== 'prose-leakage');

    return {
      ok: fatal.length === 0,
      issues,
      shape,
      componentCount: list.length,
    };
  },
};
