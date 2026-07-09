import { Code } from '../Code.js';
import { RuntimeDemo } from './RuntimeDemo.js';

export interface PackageInfo {
  slug: string;
  label: string;
  npm: string;
  dir: string;
  tagline: string;
  purpose: string;
  installCmd?: string;
  hideInstall?: boolean;
  extra?: React.ReactNode;
  seeAlso?: { label: string; slug: string };
}

export const PACKAGES: PackageInfo[] = [
  {
    slug: 'spec',
    label: 'mdma-spec',
    npm: '@mobile-reality/mdma-spec',
    dir: 'spec',
    tagline:
      'Format specification — Zod schemas, TypeScript types, and AST node definitions for all 9 component types.',
    purpose:
      'Everything in the MDMA stack depends on this package. It defines the TypeScript interfaces and Zod validation schemas for every node type in the MDMA AST. Import from mdma-spec when building custom parsers, renderers, or validators that need to work with typed MDMA nodes directly.',
  },
  {
    slug: 'parser',
    label: 'mdma-parser',
    npm: '@mobile-reality/mdma-parser',
    dir: 'parser',
    tagline: 'A remark plugin that transforms Markdown into a typed MDMA AST.',
    purpose:
      'Drop it into any unified pipeline alongside remark-parse to extract MDMA code blocks from Markdown, validate their YAML payloads against the spec schemas, and emit a typed MdmaRoot tree. The parser also builds a binding dependency graph so the runtime knows which components observe each other at parse time.',
    extra: (
      <>
        <h3>How it works</h3>
        <p>
          Regular Markdown passes through unchanged. Any <code>```mdma</code> code block is
          intercepted, validated against the spec schemas, and replaced with a typed{' '}
          <code>MdmaBlock</code> node in the AST.
        </p>

        <h3>Input</h3>
        <Code lang="ts">{`import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

const processor = unified()
  .use(remarkParse)
  .use(remarkMdma);

const markdown = \`
\\\`\\\`\\\`mdma
type: form
id: contact-form
fields:
  - name: email
    type: email
    label: "Email"
    required: true
\\\`\\\`\\\`
\`;

const tree = processor.parse(markdown);
const ast = await processor.run(tree) as MdmaRoot;`}</Code>

        <h3>Output AST</h3>
        <Code lang="json">{`{
  "type": "root",
  "children": [
    {
      "type": "mdmaBlock",
      "component": {
        "type": "form",
        "id": "contact-form",
        "fields": [
          {
            "name": "email",
            "type": "email",
            "label": "Email",
            "required": true
          }
        ]
      }
    }
  ]
}`}</Code>

        <p>
          Blocks that fail schema validation are left as plain <code>code</code> nodes with{' '}
          <code>lang: "mdma"</code> so the rest of the document still renders normally.
        </p>
      </>
    ),
  },
  {
    slug: 'runtime',
    label: 'mdma-runtime',
    npm: '@mobile-reality/mdma-runtime',
    dir: 'runtime',
    tagline: 'Headless reactive state engine for MDMA documents.',
    purpose:
      'Owns the live state of every interactive component in a document — field values, checkbox states, approval statuses, webhook results. Dispatches typed actions, maintains a binding dependency graph, enforces environment policies, and writes every interaction to a tamper-evident audit log with automatic PII redaction. Framework-agnostic: React, Vue, or plain JS can all subscribe to its state changes.',
    extra: (
      <>
        <h3>Live Action Log</h3>
        <p>Check or uncheck items below to see the runtime dispatching actions in real time.</p>
        <RuntimeDemo />
      </>
    ),
  },
  {
    slug: 'attachables-core',
    label: 'mdma-attachables-core',
    npm: '@mobile-reality/mdma-attachables-core',
    dir: 'attachables-core',
    tagline: 'Stateful handlers for the 7 interactive MDMA component types.',
    purpose:
      "Bridges the runtime's action dispatcher and each component's specific state shape. Covers form, button, tasklist, table, callout, approval-gate, and webhook — the components that manage state. Rendering layers such as mdma-renderer-react use these handlers to wire UI events to the runtime without re-implementing interaction logic per renderer.",
  },
  {
    slug: 'prompt-pack',
    label: 'mdma-prompt-pack',
    npm: '@mobile-reality/mdma-prompt-pack',
    dir: 'prompt-pack',
    tagline: 'System prompts that teach LLMs how to author valid MDMA documents.',
    purpose:
      'Curated, model-specialised prompt variants for every major provider — Anthropic, OpenAI, Google, and xAI. Each variant ships two prompts: an author prompt for inline chat workflows and an agent-tool prompt for tool-call agentic loops. Use buildSystemPrompt to merge them with your own agent instructions without overwriting either side.',
    seeAlso: { label: 'Prompt Matrix', slug: 'prompt-matrix' },
  },
  {
    slug: 'validator',
    label: 'mdma-validator',
    npm: '@mobile-reality/mdma-validator',
    dir: 'validator',
    tagline: 'Static analysis engine with 17 lint rules for MDMA documents.',
    purpose:
      'Validates documents against the spec and runs structural checks for ID uniqueness, binding syntax correctness, action-target references, PII sensitivity flags, and more. Works as an importable library or through the CLI. Integrate it into CI pipelines to catch malformed documents before they reach production.',
    seeAlso: { label: 'Validator', slug: 'validator' },
  },
  {
    slug: 'cli',
    label: 'mdma-cli',
    npm: '@mobile-reality/mdma-cli',
    dir: 'cli',
    tagline: 'Command-line tool for building prompts and validating documents.',
    purpose:
      'Interactive CLI that lets you create and preview custom MDMA prompt variants without writing code, and validate any MDMA document against the full set of lint rules. Useful for local development, debugging prompt configurations, and inspecting validation errors in detail.',
    installCmd: 'npx @mobile-reality/mdma-cli',
    seeAlso: { label: 'CLI', slug: 'cli' },
  },
  {
    slug: 'mcp',
    label: 'mdma-mcp',
    npm: '@mobile-reality/mdma-mcp',
    dir: 'mcp',
    tagline: 'MCP server that exposes MDMA spec and tooling to AI assistants.',
    purpose:
      'Implements the Model Context Protocol to make the MDMA spec, authoring prompts, and validation tools directly available to MCP-compatible AI clients such as Claude Desktop and Cursor. The assistant can read the spec in-context and validate documents without leaving the conversation.',
    hideInstall: true,
    extra: (
      <>
        <h3>Setup</h3>
        <p>
          Add to your MCP client config (Claude Desktop, Cursor, etc.) — no separate install needed:
        </p>
        <Code lang="json">{`{
  "mcpServers": {
    "mdma": {
      "command": "npx",
      "args": ["@mobile-reality/mdma-mcp"]
    }
  }
}`}</Code>
      </>
    ),
    seeAlso: { label: 'MCP & Skills', slug: 'mcp' },
  },
];

export function PackageDetail({
  pkg,
  onNavigate,
}: {
  pkg: PackageInfo;
  onNavigate: (slug: string) => void;
}) {
  return (
    <>
      <h2>{pkg.label}</h2>
      <p className="docs-package-tagline">{pkg.tagline}</p>

      {!pkg.hideInstall && (
        <>
          <h3>Install</h3>
          <Code lang="bash">{pkg.installCmd ?? `npm install ${pkg.npm}`}</Code>
        </>
      )}

      <h3>Purpose</h3>
      <p>{pkg.purpose}</p>

      {pkg.extra}

      <p>
        <a
          href={`https://github.com/MobileReality/mdma/tree/main/packages/${pkg.dir}`}
          target="_blank"
          rel="noreferrer"
          className="docs-package-github-link"
        >
          View source on GitHub →
        </a>
      </p>

      {pkg.seeAlso && (
        <div className="docs-package-see-also">
          <span>More information: </span>
          <button
            type="button"
            className="docs-package-see-also-link"
            onClick={() => onNavigate(pkg.seeAlso!.slug)}
          >
            {pkg.seeAlso.label} →
          </button>
        </div>
      )}
    </>
  );
}
