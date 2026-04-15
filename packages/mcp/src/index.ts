import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSpec } from './tools/get-spec.js';
import { getPrompt } from './tools/get-prompt.js';
import { buildPrompt } from './tools/build-system-prompt.js';
import { validatePrompt } from './tools/validate-prompt.js';
import { listPackages } from './tools/list-packages.js';
import { listDocs, getDoc } from './tools/get-doc.js';

export function createMdmaMcpServer(): McpServer {
  const server = new McpServer({
    name: 'mdma-mcp',
    version: '0.2.2',
  });

  server.tool(
    'get-spec',
    'Returns the full MDMA specification: component types, schemas (as JSON Schema), binding syntax, and authoring rules',
    {},
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(getSpec(), null, 2) }],
    }),
  );

  server.tool(
    'get-prompt',
    'Returns a named MDMA prompt (mdma-author, mdma-reviewer, or mdma-fixer)',
    { name: z.string().describe('Prompt name: mdma-author, mdma-reviewer, or mdma-fixer') },
    async ({ name }) => {
      const result = getPrompt(name);
      if ('error' in result) {
        return { content: [{ type: 'text', text: result.error }], isError: true };
      }
      return { content: [{ type: 'text', text: result.content }] };
    },
  );

  server.tool(
    'build-system-prompt',
    'Generates a custom MDMA prompt from structured input (domain, components, fields, steps). Returns only the custom prompt part — use buildSystemPrompt({ customPrompt }) in code to combine it with the base MDMA spec.',
    {
      domain: z.string().optional().describe('Domain context (e.g. "HR onboarding", "expense approval")'),
      components: z.array(z.string()).optional().describe('Component types to use (e.g. ["form", "approval-gate", "webhook"])'),
      fields: z.array(z.object({
        name: z.string().describe('Field name (kebab-case)'),
        type: z.string().describe('Field type: text, number, email, date, select, checkbox, textarea'),
        label: z.string().optional().describe('Display label'),
        required: z.boolean().optional().describe('Whether field is required'),
        sensitive: z.boolean().optional().describe('Whether field contains PII'),
        options: z.array(z.string()).optional().describe('Select options (for type: select)'),
      })).optional().describe('Form field definitions'),
      steps: z.array(z.object({
        label: z.string().describe('Step name (e.g. "Registration Form")'),
        description: z.string().describe('What this step does'),
      })).optional().describe('Multi-step flow definitions — each step becomes a separate conversation turn'),
      businessRules: z.string().optional().describe('Business rules or constraints'),
    },
    async (input) => ({
      content: [{ type: 'text', text: buildPrompt(input) }],
    }),
  );

  server.tool(
    'validate-prompt',
    'Validates a custom prompt against MDMA conventions. Returns warnings for anti-patterns and suggestions for improvements.',
    { prompt: z.string().describe('The custom prompt text to validate') },
    async ({ prompt }) => ({
      content: [{ type: 'text', text: JSON.stringify(validatePrompt(prompt), null, 2) }],
    }),
  );

  server.tool(
    'list-packages',
    'Returns all MDMA npm packages with their purpose, install command, usage example, and category',
    {},
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(listPackages(), null, 2) }],
    }),
  );

  server.tool(
    'list-docs',
    'Returns the catalog of MDMA documentation files available for fetching from the public GitHub repo (path, title, description). Use this to discover what docs you can pass to get-doc.',
    {},
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(listDocs(), null, 2) }],
    }),
  );

  server.tool(
    'get-doc',
    'Fetches the latest version of an MDMA documentation file from the public GitHub repo (raw.githubusercontent.com/MobileReality/mdma) and returns its contents as text. Allowed paths: any entry from list-docs, plus any *.md file under "docs/" or "blueprints/". Defaults to the "main" branch.',
    {
      path: z.string().describe('Repo-relative path to the doc, e.g. "docs/getting-started/quick-start.md" or "blueprints/kyc-case/README.md"'),
      ref: z.string().optional().describe('Git ref (branch, tag, or commit SHA). Defaults to "main".'),
    },
    async ({ path, ref }) => {
      const result = await getDoc(path, ref);
      if ('error' in result) {
        return { content: [{ type: 'text', text: result.error }], isError: true };
      }
      return {
        content: [
          { type: 'text', text: `# Source: ${result.url}\n\n${result.content}` },
        ],
      };
    },
  );

  return server;
}

export { getSpec } from './tools/get-spec.js';
export { getPrompt } from './tools/get-prompt.js';
export { buildPrompt, type BuildPromptInput, type FieldDefinition, type FlowStep } from './tools/build-system-prompt.js';
export { validatePrompt, type PromptValidationResult, type PromptConstraints } from './tools/validate-prompt.js';
export { listPackages, type PackageInfo } from './tools/list-packages.js';
export { listDocs, getDoc, isAllowedPath, type DocEntry, type GetDocResult, type GetDocSuccess, type GetDocError } from './tools/get-doc.js';
