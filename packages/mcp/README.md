# @mobile-reality/mdma-mcp

MCP (Model Context Protocol) server for MDMA. Exposes the MDMA spec, authoring prompts, package metadata, and live GitHub documentation to AI assistants.

## Tools

| Tool | Purpose |
|------|---------|
| `get-spec` | Returns the full MDMA specification (component types, JSON schemas, binding syntax, authoring rules). |
| `get-prompt` | Returns a named MDMA prompt (`mdma-author`, `mdma-reviewer`, `mdma-fixer`). |
| `build-system-prompt` | Generates a custom MDMA prompt from structured input (domain, components, fields, steps, business rules). |
| `validate-prompt` | Validates a custom prompt against MDMA conventions. |
| `list-packages` | Returns all MDMA npm packages with purpose, install command, usage example, and category. |
| `list-docs` | Returns the catalog of MDMA documentation files available for fetching from the public GitHub repo. |
| `get-doc` | Fetches the latest version of a doc from `raw.githubusercontent.com/MobileReality/mdma`. Supports an optional `ref` (branch, tag, or SHA). |

## Install

```json
{
  "mcpServers": {
    "mdma": { "command": "npx", "args": ["@mobile-reality/mdma-mcp"] }
  }
}
```

## Distribution venues

Places where MDMA's MCP server is published or should be published. Each venue has its own submission / update flow — when releasing a new version, check each one.

| Venue | Identifier / URL | Notes |
|-------|------------------|-------|
| **npm** | `@mobile-reality/mdma-mcp` | Publish via `pnpm publish --access public --no-git-checks`. |
| **Official MCP Registry** | `io.github.MobileReality/mdma` | Published via `mcp-publisher`. Namespace is **case-sensitive** — must match GitHub's canonical capitalization. |
| **Glama** | [`MobileReality/mdma`](https://glama.ai/mcp/servers/MobileReality/mdma) | Quality + Security scores auto-evaluated periodically. Docker build config lives in the Glama admin page — re-deploy + re-release when bumping. |
| **awesome-mcp-servers** | `punkpeye/awesome-mcp-servers` | Entry sits under **Developer Tools** alphabetically. |
| **Smithery Skills** | `mobilereality/mdma` | Skills surface — not the MCP surface (Smithery's MCP flow is HTTP-only, unusable for stdio). |
| **MCPB Desktop Extensions** | Anthropic intake form | Partner queue at Anthropic. Bundle built locally; not shipped in this repo. |

## Release checklist — when bumping the version

Use this checklist every time you publish a new version (`0.2.4 → 0.2.5`, etc.).

### 1. Bump + test

- [ ] Update `version` in [package.json](package.json).
- [ ] Update `version` string in [src/index.ts](src/index.ts) (the `McpServer({ version: ... })` call).
- [ ] Update top-level `version` **and** `packages[0].version` in [server.json](server.json).
- [ ] Update top-level `version` **and** `packages[0].version` in [manifest.json](manifest.json).
- [ ] Add a changeset: `pnpm changeset` at repo root.
- [ ] Run `pnpm build && pnpm test && pnpm typecheck` in this package.

### 2. Publish to npm

- [ ] `pnpm publish --access public --no-git-checks` from this directory.
- [ ] Verify: `npm view @mobile-reality/mdma-mcp version mcpName` — both should match.

### 3. Publish to the MCP Registry

- [ ] Ensure `mcp-publisher` is authenticated: `mcp-publisher login github` (re-auth if tokens expired).
- [ ] `mcp-publisher publish` from this directory.
- [ ] Verify: `curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.MobileReality/mdma"` shows the new version.

> **Do not commit** `.mcpregistry_github_token` / `.mcpregistry_registry_token` — they are in [.gitignore](../../.gitignore). GitHub's push protection will block the push anyway; this is a belt-and-braces reminder.

### 4. Tag the release

```bash
git tag '@mobile-reality/mdma-mcp@<version>'
git push origin '@mobile-reality/mdma-mcp@<version>'
```

### 5. Build a fresh MCPB bundle (only if submitting a Desktop Extension update)

pnpm's virtual store (`.pnpm/`) gets stripped by `mcpb pack`, so you **must** build the bundle from a clean npm-installed directory or transitive deps (e.g. `ajv`) will be missing.

Output: `<name>-<version>.mcpb`. Test-install in Claude Desktop, then attach as a GitHub Release asset.

### 6. Glama — if tool descriptions or Dockerfile config changed

- [ ] If you added / renamed / changed descriptions of tools: Glama's Quality score will re-evaluate on its next periodic scan. No manual trigger.
- [ ] If `packages[0].version` bumped: go to the Glama admin page → update **Build steps** (`npm install -g @mobile-reality/mdma-mcp@<version>`) → **Deploy** → **Make Release**.

### 7. Downstream awareness

- [ ] Update the MCP tools table in the root [README.md](../../README.md) if tools were added / renamed / removed.
- [ ] Update this package's own tools table (above) the same way.
- [ ] If a breaking change: note in the changeset; update consumers of `createMdmaMcpServer()` if any.

## Troubleshooting

### MCP Registry publish fails with 403 Forbidden

If the error says `permission to publish: io.github.gitsad/*, io.github.MobileReality/*. Attempting to publish: io.github.mobilereality/mdma` (lowercase mismatch): the registry is case-sensitive and your `mcpName` / `server.json` `name` must exactly match GitHub's canonical `MobileReality` capitalization. Fix both files and republish to npm (versions on npm are immutable).

If the error says `permission to publish: io.github.gitsad/*` (org missing entirely): your MobileReality GitHub membership is private. Make it public at <https://github.com/orgs/MobileReality/people>, then `mcp-publisher logout && mcp-publisher login github` to refresh the JWT.

### MCPB `.mcpb` crashes on install in Claude Desktop

Usually "missing module" errors in the Developer tab logs. Cause: pnpm's nested `.pnpm/` virtual store got stripped at pack time, so transitive deps are missing. Fix: build the bundle from a clean npm-installed directory (see step 5 above). Do **not** run `mcpb pack` directly against `packages/mcp/node_modules`.

### Secrets leaking into the bundle

`mcpb pack` does **not** respect `.gitignore`. Any `.mcpregistry_*_token` file next to the manifest at pack time gets zipped into the `.mcpb`. Always delete these before packing, and prefer the `/tmp/mcpb-build` workflow above which has no tokens in its directory.

## Files in this package

| File | Purpose | Tracked? |
|------|---------|----------|
| [src/](src/) | TypeScript source for the server + tools. | ✅ |
| [dist/](dist/) | Compiled JavaScript. | ❌ (gitignored) |
| [tests/](tests/) | Vitest unit tests for tool logic. | ✅ |
| [package.json](package.json) | Contains the `mcpName` field required by the MCP Registry. | ✅ |
| [server.json](server.json) | MCP Registry manifest consumed by `mcp-publisher`. | ✅ |
| [manifest.json](manifest.json) | MCPB (Desktop Extension) manifest. | ✅ |
| [icon.png](icon.png) | 1024×1024 square icon for the MCPB submission. | ✅ |
| [screenshots/](screenshots/) | Screenshots bundled with the MCPB for the Claude Desktop install dialog. | ✅ |
| `*.mcpb` | Built Desktop Extension bundle (build artifact). | ❌ (gitignored) |
