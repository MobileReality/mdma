import { Code } from '../Code.js';
import { Table } from '../Table.js';

export function Validator() {
  return (
    <>
      <h2>Validator</h2>
      <p>
        Static analysis engine for MDMA documents. Validates structure, catches common LLM mistakes,
        and auto-fixes what it can.
      </p>
      <Code lang="ts">{`import { validate } from '@mobile-reality/mdma-validator';

const result = validate(markdown);
// result.ok        — true if no unfixed errors
// result.issues    — all issues found
// result.output    — auto-fixed markdown
// result.fixCount  — number of issues auto-fixed`}</Code>

      <h2>Rules</h2>
      <Table
        headers={['Rule', 'Severity', 'Auto-fix', 'Description']}
        rows={[
          [
            'yaml-correctness',
            'error',
            '—',
            'YAML parses successfully. Detects and auto-splits multi-component blocks, strips --- separators.',
          ],
          [
            'field-name-typos',
            'warning',
            '—',
            'Common field name mistakes: roles → allowedRoles, onClick → onAction.',
          ],
          [
            'schema-conformance',
            'error',
            'yes',
            'Component type exists and data conforms to its Zod schema. Fuzzy type suggestions.',
          ],
          [
            'duplicate-ids',
            'error',
            'yes',
            'All component IDs are unique. Auto-fix appends -1, -2 suffixes.',
          ],
          [
            'id-format',
            'warning',
            'yes',
            'IDs follow kebab-case. Auto-fix converts camelCase, snake_case, PascalCase.',
          ],
          [
            'binding-syntax',
            'error/warning',
            'yes',
            '{{binding}} expressions are well-formed. Catches empty {{ }}, extra whitespace, single-brace {path}.',
          ],
          [
            'action-references',
            'warning',
            'yes',
            'onSubmit, onAction, etc. reference existing component IDs.',
          ],
          [
            'sensitive-flags',
            'warning',
            'yes',
            'Fields with PII-like names (email, phone, ssn) have sensitive: true.',
          ],
          [
            'required-markers',
            'info',
            '—',
            'Suggests required: true for fields named name, email, title, summary.',
          ],
          [
            'thinking-block',
            'warning/info',
            '—',
            'Thinking block should be the first component and only one should exist.',
          ],
          ['table-data-keys', 'warning', '—', 'Data row keys match defined column keys.'],
          [
            'select-options',
            'warning',
            '—',
            'select fields have options defined as [{label, value}] objects.',
          ],
          [
            'chart-validation',
            'warning',
            '—',
            'Chart CSV data has headers + data rows. xAxis/yAxis reference actual column headers.',
          ],
          [
            'placeholder-content',
            'info',
            '—',
            'Catches TODO, TBD, FIXME, ..., lorem ipsum in content fields.',
          ],
          [
            'flow-ordering',
            'error/info',
            '—',
            'Forward-only action references, no circular refs, one interactive component type per message.',
          ],
          [
            'data-source',
            'error',
            '—',
            '{ source, params } refs on table data, chart data, and select options. With a dataSourceCatalog, checks source names, kinds, declared and required params, types, allowed values, and that table columns and chart axes exist in the source.',
          ],
          [
            'expected-components',
            'error',
            '—',
            'Verifies components match expected types, form fields, and table columns.',
          ],
        ]}
      />

      <h2>Data source catalog</h2>
      <p>
        The <code>data-source</code> rule always checks that a <code>{'{ source, params }'}</code>{' '}
        ref names a source. Pass the host's catalog — the same definitions you register on the store
        — to check the ref against it:
      </p>
      <Code lang="ts">
        {'const result = validate(markdown, { dataSourceCatalog: dataSources });'}
      </Code>
      <p>
        Messages include <code>Unknown data source "x"</code>,{' '}
        <code>Data source "x" is kind "rows" but "data" needs kind "series"</code>,{' '}
        <code>Data source "x" does not declare param "p"</code>,{' '}
        <code>Data source "x" is missing required param "p"</code>,{' '}
        <code>Column "c" is not provided by data source "x"</code>, and{' '}
        <code>"xAxis" key "k" is not provided by data source "x"</code>. Pass the same catalog to{' '}
        <code>buildFixerMessage(markdown, issues, {'{ dataSources }'})</code> so an LLM repair keeps
        the ref instead of inventing rows.
      </p>

      <h2>Auto-fix Pipeline</h2>
      <p>
        When <code>autoFix: true</code> (default), 6 fix strategies run in strict dependency order:
      </p>
      <ol className="docs-list">
        <li>
          <strong>id-format</strong> — normalize IDs to kebab-case, update all cross-references
        </li>
        <li>
          <strong>duplicate-ids</strong> — deduplicate after normalization
        </li>
        <li>
          <strong>binding-syntax</strong> — fix <code>{'{x}'}</code> → <code>{'{{x}}'}</code>, strip
          whitespace
        </li>
        <li>
          <strong>sensitive-flags</strong> — add <code>sensitive: true</code> to PII fields
        </li>
        <li>
          <strong>action-references</strong> — remove invalid references
        </li>
        <li>
          <strong>schema-conformance</strong> — patch missing labels/headers/content, infer field
          types
        </li>
      </ol>
    </>
  );
}
