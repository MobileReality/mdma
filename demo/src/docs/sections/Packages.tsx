import { Code } from '../Code.js';
import { Table } from '../Table.js';

interface PackagesProps {
  onNavigate: (slug: string) => void;
}

function navLink(slug: string, label: string, onNavigate: (slug: string) => void) {
  return (
    <button
      key={slug}
      type="button"
      className="docs-packages-nav-link"
      onClick={() => onNavigate(`packages/${slug}`)}
    >
      {label}
    </button>
  );
}

export function Packages({ onNavigate }: PackagesProps) {
  return (
    <>
      <h2>Packages</h2>
      <Table
        headers={['Package', 'Description']}
        rows={[
          [navLink('spec', 'mdma-spec', onNavigate), 'The foundation — Zod schemas, TypeScript types, and AST definitions for all 9 component types.'],
          [navLink('parser', 'mdma-parser', onNavigate), 'A remark plugin that transforms Markdown into an MDMA-extended AST. Extracts mdma code blocks, validates YAML, and builds a binding dependency graph.'],
          [navLink('runtime', 'mdma-runtime', onNavigate), 'Headless state management engine. Manages reactive bindings, dispatches actions, enforces environment policies, and writes every event to a tamper-evident audit log with automatic PII redaction.'],
          [navLink('attachables-core', 'mdma-attachables-core', onNavigate), 'Handlers for 7 of the 9 component types — the ones that manage state (form, button, tasklist, table, callout, approval-gate, webhook).'],
          [navLink('renderer-react', 'mdma-renderer-react', onNavigate), 'React rendering layer with components for all 9 MDMA types and hooks for state access.'],
          [navLink('prompt-pack', 'mdma-prompt-pack', onNavigate), 'System prompts that teach LLMs how to author valid MDMA documents. Ships model-specialised variants for OpenAI, Anthropic, Google, and xAI.'],
          [navLink('validator', 'mdma-validator', onNavigate), 'Static analysis engine with 17 lint rules covering schema conformance, ID uniqueness, binding syntax, action references, PII sensitivity, and more.'],
          [navLink('cli', 'mdma-cli', onNavigate), 'Interactive CLI tool for creating custom MDMA prompts and validating documents.'],
          [navLink('mcp', 'mdma-mcp', onNavigate), 'MCP server that exposes MDMA spec, prompts, and tooling to AI assistants.'],
        ]}
      />

      <h2>Architecture</h2>
      <Code lang="text">{`mdma-spec                  Format specification + Zod schemas
  ├── mdma-parser          Markdown → MDMA AST (remark plugin)
  ├── mdma-prompt-pack     AI authoring prompts
  ├── mdma-validator       Document validation
  └── mdma-runtime         State / events / policy engine
        └── mdma-attachables-core   Component handlers
              └── mdma-renderer-react   React components
mdma-cli                   CLI prompt builder + validation
mdma-mcp                   MCP server for AI assistants`}</Code>
    </>
  );
}
