const REPO = 'MobileReality/mdma';
const DEFAULT_REF = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}`;

export interface DocEntry {
  path: string;
  title: string;
  description: string;
}

const DOC_CATALOG: DocEntry[] = [
  {
    path: 'README.md',
    title: 'README',
    description: 'Project overview, install, basic usage, packages list, and roadmap',
  },
  {
    path: 'docs/getting-started/quick-start.md',
    title: 'Quick Start',
    description: 'End-to-end walkthrough: parse markdown, create a store, render with React',
  },
  {
    path: 'docs/getting-started/architecture.md',
    title: 'Architecture',
    description: 'Package dependency graph and the role of each MDMA package',
  },
  {
    path: 'docs/getting-started/concepts.md',
    title: 'Concepts',
    description: 'Core MDMA concepts: components, bindings, events, policy, audit log',
  },
  {
    path: 'docs/guides/creating-documents.md',
    title: 'Creating Documents',
    description: 'How to author MDMA markdown documents by hand',
  },
  {
    path: 'docs/guides/creating-attachables.md',
    title: 'Creating Attachables',
    description: 'How to write custom component handlers for non-builtin types',
  },
  {
    path: 'docs/guides/creating-blueprints.md',
    title: 'Creating Blueprints',
    description: 'How to package a domain-specific MDMA blueprint',
  },
  {
    path: 'docs/guides/enterprise-features.md',
    title: 'Enterprise Features',
    description: 'PII redaction, tamper-evident audit logs, policy engine',
  },
  {
    path: 'docs/reference/component-catalog.md',
    title: 'Component Catalog',
    description: 'Reference for all 9 built-in component types and their fields',
  },
  {
    path: 'blueprints/README.md',
    title: 'Blueprints Index',
    description: 'List of starter blueprints (clinical-ops, kyc-case, incident-triage, etc.)',
  },
  {
    path: 'CONTRIBUTING.md',
    title: 'Contributing',
    description: 'How to contribute to the MDMA project',
  },
];

export function listDocs(): DocEntry[] {
  return DOC_CATALOG;
}

export interface GetDocSuccess {
  path: string;
  ref: string;
  url: string;
  content: string;
}

export interface GetDocError {
  error: string;
}

export type GetDocResult = GetDocSuccess | GetDocError;

export async function getDoc(path: string, ref: string = DEFAULT_REF): Promise<GetDocResult> {
  if (!isAllowedPath(path)) {
    return {
      error: `Path "${path}" is not in the allowed doc set. Call list-docs to see available paths, or pass a path under "docs/", "blueprints/", or one of the top-level *.md files.`,
    };
  }
  const url = `${RAW_BASE}/${encodeURIComponent(ref)}/${path}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { error: `Failed to fetch ${url}: HTTP ${res.status} ${res.statusText}` };
    }
    const content = await res.text();
    return { path, ref, url, content };
  } catch (err) {
    return { error: `Network error fetching ${url}: ${(err as Error).message}` };
  }
}

export function isAllowedPath(path: string): boolean {
  if (!path || path.includes('..') || path.startsWith('/')) return false;
  if (DOC_CATALOG.some((d) => d.path === path)) return true;
  if (!path.endsWith('.md')) return false;
  return path.startsWith('docs/') || path.startsWith('blueprints/');
}
