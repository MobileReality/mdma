import { Code } from '../Code.js';
import { Table } from '../Table.js';

export function Mcp() {
  return (
    <>
      <h2>MCP Server</h2>
      <p>
        MCP (Model Context Protocol) server that lets AI assistants understand and work with MDMA.
        It exposes the spec, authoring prompts, package metadata, and live GitHub documentation to
        any MCP-compatible AI assistant.
      </p>

      <h2>Setup</h2>
      <p>Add to your MCP client config (Claude Desktop, Cursor, etc.):</p>
      <Code lang="json">{`{
  "mcpServers": {
    "mdma": {
      "command": "npx",
      "args": ["@mobile-reality/mdma-mcp"]
    }
  }
}`}</Code>

      <h2>Skills</h2>
      <p>
        This repository ships a skill file you can use directly:{' '}
        <a
          href="https://github.com/MobileReality/mdma/blob/main/skills/mdma-integration/SKILL.md"
          target="_blank"
          rel="noreferrer"
        >
          <code>skills/mdma-integration/SKILL.md</code>
        </a>
        . Drop it into any agent that supports skill files (Claude Code, custom harnesses, etc.) and
        it teaches the agent the full MDMA integration surface — parse → store → render, LLM
        streaming, custom components, prompt authoring, CI validation, and MCP wiring.
      </p>

      <h2>Smithery</h2>
      <p>
        Smithery is a registry for AI skills. MDMA is published there as{' '}
        <code>mobilereality/mdma</code> — find it on the Skills surface and install it in one click
        without touching any JSON config.
      </p>
      <p className="docs-note">
        Smithery's MCP surface is HTTP-only and doesn't support stdio servers, so MDMA is listed
        under Skills rather than MCP servers.
      </p>

      <h2>Tools</h2>
      <Table
        headers={['Tool', 'Description']}
        rows={[
          [
            'get-spec',
            'Returns the full MDMA specification: component types, JSON schemas, binding syntax, and authoring rules.',
          ],
          [
            'get-prompt',
            'Returns a named prompt (mdma-author, mdma-reviewer, or mdma-fixer). Accepts optional variantId for model-optimised variant.',
          ],
          [
            'list-prompt-variants',
            'Returns all available MDMA_AUTHOR prompt variants (id, label, description).',
          ],
          [
            'build-system-prompt',
            'Generates a custom MDMA prompt from structured input (domain, components, fields, steps, business rules).',
          ],
          ['validate-prompt', 'Validates a custom prompt against MDMA conventions.'],
          [
            'list-packages',
            'Returns all MDMA packages with purpose, install command, and usage example.',
          ],
          ['list-docs', 'Returns the catalog of MDMA documentation files available for fetching.'],
          ['get-doc', 'Fetches the latest version of an MDMA documentation file from GitHub.'],
        ]}
      />

      <h2>Where it's published</h2>
      <Table
        headers={['Venue', 'Identifier']}
        rows={[
          ['npm', '@mobile-reality/mdma-mcp'],
          ['MCP Registry', 'io.github.MobileReality/mdma'],
          ['Glama', 'MobileReality/mdma'],
          ['Smithery Skills', 'mobilereality/mdma'],
          ['Claude Desktop Extensions (MCPB)', 'Anthropic partner queue'],
        ]}
      />

      <h2>Testing locally</h2>
      <Code lang="bash">
        {'npx @modelcontextprotocol/inspector node packages/mcp/dist/bin/mdma-mcp.js'}
      </Code>
    </>
  );
}
