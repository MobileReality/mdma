/**
 * json-render (vercel-labs) adapter.
 *
 * Prompt: `catalog.prompt()` from `@json-render/core` — their official
 * prompt-generation API, default options. The default `mode` is `"standalone"`,
 * which instructs the model to emit only a JSONL stream of RFC-6902 patches, so
 * that is what we validate.
 *
 * Catalog: the 36 shipped `shadcnComponentDefinitions` ("batteries included",
 * per their README) — the strongest, most realistic catalog an integrator gets
 * out of the box.
 *
 * One addition, disclosed in the report: the shadcn catalog has **no chart
 * component**. MDMA, OpenUI Lang and A2UI all ship one, so leaving json-render
 * without one would hand it a guaranteed zero on the chart family for a reason
 * that has nothing to do with format reliability. We therefore define a `Chart`
 * component the way an integrator would, using their own `defineCatalog` API,
 * with a prop shape deliberately kept no richer than the others'.
 *
 * Validator: their own `createSpecStreamCompiler()` to replay the patch stream
 * into a spec, then `catalog.validate(spec)` — their Zod validation, unmodified.
 */

import { createSpecStreamCompiler, defineCatalog, validateSpec } from '@json-render/core';
import { schema } from '@json-render/react/schema';
import { shadcnComponentDefinitions } from '@json-render/shadcn/catalog';
import { z } from 'zod';
import type { FormatAdapter, ValidationIssue, ValidationResult } from './types.js';

const catalog = defineCatalog(schema, {
  components: {
    ...shadcnComponentDefinitions,
    // See the note above — parity with the chart capability the other three ship.
    Chart: {
      description: 'A bar or pie chart rendering a labelled numeric series',
      props: z.object({
        type: z.enum(['bar', 'pie', 'line']),
        title: z.string().nullable(),
        labels: z.array(z.string()),
        values: z.array(z.number()),
      }),
    },
  },
  actions: {
    submit_form: { description: 'Submit the form and send its values to the server' },
    download_invoice: { description: 'Download the current invoice as a PDF' },
    upgrade_plan: { description: 'Upgrade the subscription to the annual plan' },
    cancel_subscription: { description: 'Cancel the subscription' },
    refresh_data: { description: 'Reload the data shown on screen' },
  },
});

/** Strip anything that is not a JSON object line — models like to add fences. */
function extractJsonl(output: string): { lines: string[]; fenced: boolean } {
  let text = output.trim();
  let fenced = false;

  // Un-fence ```json / ```jsonl / ``` blocks if the model wrapped its output.
  const fence = text.match(/```(?:jsonl?|json5)?\s*\n([\s\S]*?)```/);
  if (fence) {
    text = fence[1];
    fenced = true;
  }

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{') && l.endsWith('}'));

  return { lines, fenced };
}

/** Element types in document order, content stripped — for repeat-consistency. */
function shapeOf(spec: unknown): string {
  const s = spec as { elements?: Record<string, { type?: string }> };
  if (!s?.elements) return '';
  return Object.values(s.elements)
    .map((e) => e?.type ?? '?')
    .join(',');
}

export const jsonRenderAdapter: FormatAdapter = {
  id: 'json-render',
  label: 'json-render',
  promptSource: 'catalog.prompt() — @json-render/core 0.19.0, shadcn catalog + Chart',

  async systemPrompt(): Promise<string> {
    return catalog.prompt();
  },

  validate(output: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { lines, fenced } = extractJsonl(output);

    if (lines.length === 0) {
      issues.push({
        kind: 'no-structured-output',
        message: 'no JSON patch lines found in the response',
      });
      return { ok: false, issues, componentCount: 0 };
    }

    if (fenced) {
      // Recorded, but not fatal: their streaming parser tolerates it and the
      // spec still renders. Counting it as a failure would be stricter than the
      // format's own runtime.
      issues.push({
        kind: 'prose-leakage',
        message: 'output was wrapped in a code fence (standalone mode says raw JSONL)',
      });
    }

    const compiler = createSpecStreamCompiler();
    let applied = 0;
    for (const line of lines) {
      try {
        compiler.push(`${line}\n`);
        applied += 1;
      } catch (err) {
        issues.push({
          kind: 'parse-error',
          message: `patch line ${applied + 1} failed: ${(err as Error).message}`,
        });
        return { ok: false, issues, componentCount: applied };
      }
    }

    const spec = compiler.getResult() as {
      root?: string;
      elements?: Record<string, Record<string, unknown>>;
    };

    if (!spec?.root) {
      issues.push({ kind: 'schema-error', message: 'spec has no /root element' });
      return { ok: false, issues, componentCount: 0 };
    }
    if (!spec.elements || Object.keys(spec.elements).length === 0) {
      issues.push({ kind: 'schema-error', message: 'spec has no elements' });
      return { ok: false, issues, componentCount: 0 };
    }
    if (!spec.elements[spec.root]) {
      issues.push({
        kind: 'broken-reference',
        message: `/root points at "${spec.root}" which is not in /elements`,
      });
      return { ok: false, issues, componentCount: Object.keys(spec.elements).length };
    }

    // Dangling children make a subtree silently vanish at render time.
    for (const [id, el] of Object.entries(spec.elements)) {
      const children = (el as { children?: unknown }).children;
      if (!Array.isArray(children)) continue;
      for (const child of children) {
        if (typeof child === 'string' && !spec.elements[child]) {
          issues.push({
            kind: 'broken-reference',
            message: `element "${id}" references missing child "${child}"`,
          });
        }
      }
    }

    // `catalog.validate()` is the strict Zod gate and requires `children` on
    // every element. Their own runtime does not: `validateSpec()` reports a
    // childless leaf as valid, and the renderer renders it. Defaulting
    // `children` to `[]` before the strict check removes that purely structural
    // artifact, so we measure what the renderer would actually do rather than
    // what the type definition insists on. Without this, json-render fails on
    // leaf elements for a reason that has nothing to do with format reliability.
    for (const element of Object.values(spec.elements)) {
      if (element && typeof element === 'object' && element.children === undefined) {
        element.children = [];
      }
    }

    // Primary gate: their runtime spec validator — "would this render?"
    const runtime = validateSpec(spec as never);
    if (!runtime.valid) {
      for (const issue of (runtime.issues ?? []).slice(0, 8)) {
        const i = issue as { message?: string; path?: string };
        issues.push({
          kind: 'schema-error',
          message: `validateSpec ${i.path ?? ''}: ${i.message ?? 'invalid'}`,
        });
      }
    }

    // Secondary gate: catalog conformance — unknown component types and wrong
    // prop types, which the runtime validator does not check.
    const result = catalog.validate(spec);
    if (!result.success) {
      const zodIssues = (result as { error?: { issues?: unknown[] } }).error?.issues ?? [];
      for (const issue of zodIssues.slice(0, 8)) {
        const i = issue as { code?: string; message?: string; path?: unknown[] };
        issues.push({
          kind: i.code === 'invalid_enum_value' ? 'unknown-component' : 'schema-error',
          message: `${(i.path ?? []).join('/')}: ${i.message ?? i.code}`,
        });
      }
    }

    const fatal = issues.filter((i) => !i.degraded && i.kind !== 'prose-leakage');
    return {
      ok: fatal.length === 0,
      issues,
      shape: shapeOf(spec),
      componentCount: Object.keys(spec.elements).length,
    };
  },
};
