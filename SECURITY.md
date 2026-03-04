# Security Policy

MDMA is designed for high-stakes environments (healthcare, finance, critical ops). We take security seriously.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x (current dev) | Yes -- actively maintained |
| Pre-release / nightly | Best-effort only |

Once we reach 1.0, we will maintain a formal support window for the latest major and previous major versions.

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email us at:

**security@mdma-project.dev**

Include:

1. A description of the vulnerability.
2. Steps to reproduce (or a proof-of-concept).
3. The affected package(s) and version(s).
4. Your assessment of severity (critical / high / medium / low).

### What to Expect

| Milestone | Target |
|-----------|--------|
| Acknowledgement | Within 48 hours |
| Initial triage and severity assessment | Within 5 business days |
| Fix or mitigation plan communicated | Within 14 business days |
| Patch released (critical/high) | Within 30 days |

We will coordinate disclosure with you. If you want credit in the advisory, let us know.

## Scope

The following are in scope:

- **Schema bypass** -- crafted MDMA documents that bypass Zod validation or inject unexpected data.
- **Policy engine bypass** -- actions that execute despite policy rules forbidding them.
- **PII leakage** -- sensitive fields (marked `sensitive: true`) appearing in logs, event bus payloads, or rendered output.
- **Redaction failures** -- the redactor (`@mobile-reality/mdma-runtime`) failing to mask, hash, or omit PII as configured.
- **Event log integrity** -- tampering with or forging audit log entries (hash-chain breaks).
- **Approval gate bypass** -- approval-gate components accepting unauthorized approvers or skipping required approvals.
- **Injection via bindings** -- binding expressions (`{{variable.path}}`) that resolve to executable code or leak cross-component state.
- **Dependency vulnerabilities** -- known CVEs in direct dependencies that are exploitable in MDMA's usage context.

The following are **out of scope**:

- Vulnerabilities in applications that consume MDMA as a library (report those to the application maintainer).
- Denial-of-service via extremely large documents (we recommend input size limits at the application layer).
- Social engineering or phishing.

## Disclosure Policy

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure). We will:

1. Work with you to understand and validate the issue.
2. Develop and test a fix.
3. Release the fix and publish a security advisory on GitHub.
4. Credit you (if desired) in the advisory.

Thank you for helping keep MDMA and its users safe.
