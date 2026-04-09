export interface PackageInfo {
  name: string;
  purpose: string;
  install: string;
  usage: string;
  category: 'core' | 'rendering' | 'ai' | 'tooling';
}

export function listPackages(): PackageInfo[] {
  return [
    {
      name: '@mobile-reality/mdma-spec',
      purpose: 'TypeScript types, Zod schemas, and constants for all MDMA component types',
      install: 'npm install @mobile-reality/mdma-spec',
      usage: 'import { FormComponentSchema, COMPONENT_TYPES } from "@mobile-reality/mdma-spec"',
      category: 'core',
    },
    {
      name: '@mobile-reality/mdma-parser',
      purpose: 'Remark plugin that parses ```mdma code blocks in markdown into a typed AST',
      install: 'npm install @mobile-reality/mdma-parser',
      usage: 'import { remarkMdma } from "@mobile-reality/mdma-parser"',
      category: 'core',
    },
    {
      name: '@mobile-reality/mdma-runtime',
      purpose: 'Document store, binding resolution, event bus, policy engine, and PII redaction',
      install: 'npm install @mobile-reality/mdma-runtime',
      usage: 'import { createDocumentStore } from "@mobile-reality/mdma-runtime"',
      category: 'core',
    },
    {
      name: '@mobile-reality/mdma-renderer-react',
      purpose: 'React components that render MDMA documents with customizable element overrides',
      install: 'npm install @mobile-reality/mdma-renderer-react',
      usage: 'import { MdmaDocument } from "@mobile-reality/mdma-renderer-react"',
      category: 'rendering',
    },
    {
      name: '@mobile-reality/mdma-validator',
      purpose: 'Deterministic validator with 17 rules and auto-fix for MDMA documents',
      install: 'npm install @mobile-reality/mdma-validator',
      usage: 'import { validate } from "@mobile-reality/mdma-validator"',
      category: 'tooling',
    },
    {
      name: '@mobile-reality/mdma-prompt-pack',
      purpose: 'System prompts (author, reviewer, fixer) and prompt builder utilities',
      install: 'npm install @mobile-reality/mdma-prompt-pack',
      usage: 'import { buildSystemPrompt } from "@mobile-reality/mdma-prompt-pack"',
      category: 'ai',
    },
    {
      name: '@mobile-reality/mdma-attachables-core',
      purpose: 'Pluggable handler registry for webhooks, integrations, and custom actions',
      install: 'npm install @mobile-reality/mdma-attachables-core',
      usage: 'import { createAttachableRegistry } from "@mobile-reality/mdma-attachables-core"',
      category: 'core',
    },
    {
      name: '@mobile-reality/mdma-cli',
      purpose: 'CLI tool for validating MDMA documents and interactive prompt creation',
      install: 'npm install -g @mobile-reality/mdma-cli',
      usage: 'npx mdma validate "**/*.md" or npx mdma create',
      category: 'tooling',
    },
    {
      name: '@mobile-reality/mdma-mcp',
      purpose: 'MCP server exposing MDMA spec, prompts, and tooling to AI assistants',
      install: 'npm install @mobile-reality/mdma-mcp',
      usage: 'npx @mobile-reality/mdma-mcp (stdio transport for Claude Desktop, VS Code, etc.)',
      category: 'ai',
    },
  ];
}
