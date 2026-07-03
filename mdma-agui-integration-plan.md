# MDMA × AG-UI Integration Plan

**Status:** Draft for validation · **Version:** 0.2 · **License of all artifacts:** MIT

A proposal to make [MDMA](https://github.com/MobileReality/mdma) a first-class generative-UI
layer for the [AG-UI protocol](https://github.com/ag-ui-protocol/ag-ui), delivered as a small
adapter package plus a docs entry and a dojo demo — *not* as a framework integration.

This document exists to be **validated before significant work begins**, per AG-UI's
contributing guidance ("please PLEASE reach out to us first"). It states the thesis, the chosen
approach, the rejected alternatives, the concrete deliverables, and an explicit list of
questions the maintainers need to answer.

> **v0.2 changelog (post-verification).** Corrected against the live AG-UI repo and the MDMA
> codebase: (1) AG-UI has **no ecosystem category literally named "Generative UI"** — it is a
> *building block*; integration listings are tiered "Direct to LLM" / "Agent Framework –
> Partnerships / 1st Party / Community". Placement is therefore an open question, not a settled
> fact. (2) Approve/deny in MDMA emit **`APPROVAL_GRANTED` / `APPROVAL_DENIED`**, not
> `ACTION_TRIGGERED` (only form-submit and buttons emit `ACTION_TRIGGERED`); the adapter listens
> via `onAny` and switches on all of them. (3) No pre-drafted scaffold existed — this revision
> ships one at `packages/agui/`. (4) Onboarding is GitHub-issue-first + Discord `#-💎-contributing`;
> there is no Calendly "new integration" call.

---

## 1. Goal

Let an AG-UI agent stream MDMA interactive documents (forms, tables, approval gates) to a
frontend, have them render live, and route the user's actions back into the agent run —
closing the human-in-the-loop — with a minimal, community-maintained adapter.

## 2. Background & thesis

The two projects operate at different layers and are **complementary, not competing**:

- **AG-UI is transport.** A wire protocol: a stream of ~16 core event categories (text deltas,
  tool calls, state patches, lifecycle, interrupt; the current `EventType` enum is larger, ~30+)
  between an agent backend and a frontend, over SSE / WebSockets / HTTP.
- **MDMA is payload.** A content spec: Markdown extended with fenced ` ```mdma ` blocks that
  describe validated, renderable components. It has no agent and no transport; it is a thing
  an agent *emits*.

**Thesis:** MDMA is a concrete implementation of **generative UI** (an AG-UI *building block*)
that can ride on top of an AG-UI event stream. It is not a **framework / agent runtime**
(LangGraph, CrewAI, ADK, …) and should not be listed as one. Exactly *where* it belongs in
AG-UI's ecosystem listing is an open question for the maintainers (see §8 Q1) — there is no
single "Generative UI" bucket to drop it into.

### The human-in-the-loop split (why this matters)

HITL is two things, and MDMA only owns one:

1. **The decision surface** — presenting the choice and capturing it as validated, audited,
   PII-aware data. MDMA owns this (approval gates, forms, policy engine, audit log).
2. **The control primitive** — suspending the agent run, waiting, and resuming with state
   intact. MDMA does *not* own this; AG-UI's **interrupt** building block does
   (`agent.pendingInterrupts`, the `@ag-ui/client` `interrupts/` helpers).

The adapter is the seam between the two: MDMA renders and validates the decision; AG-UI
suspends and resumes the run. Neither half closes the loop alone.

## 3. Chosen approach

**Keep the adapter in the MDMA repo as `@mobile-reality/mdma-agui` (flat `packages/agui/`).
Contribute to AG-UI only an ecosystem docs entry plus a dojo demo that references it.**

Rationale:
- AG-UI policy states community integrations are **maintained by the contributor**. Housing
  the code in the MDMA org keeps maintenance where the domain knowledge is.
- MDMA is small and single-vendor; asking the AG-UI core team to adopt a third-party rendering
  spec is the most likely thing to stall a PR.
- This still gets MDMA listed in AG-UI's ecosystem (the visibility goal) and gives users a
  runnable demo, at the lowest coordination cost.

### Rejected alternatives (decision log)

| Option | Why not (for now) |
|---|---|
| First-class `integrations/mdma/` framework entry | MDMA isn't a framework/agent runtime; the integration guide assumes a running agent server to register in the dojo. Wrong shape. |
| Fork `@mobile-reality/mdma-renderer-react` to bake in AG-UI | Couples two release cycles; the skill's own anti-patterns warn against forking the renderer. Adapter stays external. |
| PR the adapter directly into `ag-ui` core | Adds maintenance burden to the AG-UI team for a spec they don't own; higher bar, slower merge. |
| Do nothing in AG-UI, ship adapter only in MDMA | Loses the ecosystem listing/visibility that motivates the work. |

## 4. Adapter design (`mdma-agui`)

A headless core plus an optional React layer. The headless core is defined against a **minimal
structural agent interface** (the small slice of `@ag-ui/client`'s `AbstractAgent` we touch), so
it compiles with no hard AG-UI dependency and any real `HttpAgent` satisfies it. All AG-UI
coupling is isolated to one `types.ts`. Two directions:

**Stream → render.** Subscribe to the agent. On `onTextMessageContentEvent`, use the provided
`textMessageBuffer` (the *accumulated* message text — no manual delta bookkeeping), gate on a
cheap "contains an `mdma` fence?" check, throttle-reparse (~150 ms), and feed the AST to the
MDMA store. Create the store **once** per message; every later pass calls `store.updateAst()`
so in-flight form edits and focus survive. "Latest content wins" guards async parse ordering.
A `tool` transport path handles agents that emit MDMA as a tool-call payload instead.

**Action → resume.** Listen on `store.getEventBus().onAny()` and switch on the action events:
`ACTION_TRIGGERED` (button / form submit), `APPROVAL_GRANTED`, and `APPROVAL_DENIED`
(approval-gate approve / deny). Default behavior packages the decision and re-runs the agent
(`addMessage` + `runAgent`). If the backend uses AG-UI's native interrupt, the host passes
`onAction` returning `false` and resolves the interrupt itself, so the parked run resumes with
state intact rather than starting a fresh turn.

**Dependencies:** all peer deps — `@ag-ui/client`, `@ag-ui/core`, `@mobile-reality/mdma-parser`,
`-runtime`, `-spec`, `-attachables-core`, `-renderer-react` (React layer only), plus `unified`
and `remark-parse`.

### Dataflow

```
Agent backend  ──emits AG-UI events──▶  @ag-ui/client HttpAgent
                                             │  (typed event stream)
                                             ▼
                                     mdma-agui bridge
                                     · containsMdma() gate
                                     · throttle ~150ms → parse
                                     · create once, then updateAst
                                             │
                                             ▼
                                     MDMA document store  ───▶  MdmaDocument (React)
                                             ▲                    forms, approval gates
                                             │                          │
                                             └── ACTION_TRIGGERED / ─────┘
                                                 APPROVAL_GRANTED /
                                                 APPROVAL_DENIED
                                        (bridge resumes run / resolves interrupt)
```

## 5. Deliverables

1. **`@mobile-reality/mdma-agui` package** — headless bridge + React
   (`useMdmaAgentStream`, `MdmaAgentView`). Lives flat at `packages/agui/`, modeled on the
   existing `packages/mcp/` (build config, changeset, README shape); no new grouping folder.
   **(Scaffolded in this revision.)**
2. **Example AG-UI backend** — a minimal agent that streams an `approval-gate` MDMA document
   and handles the resume, riding an existing framework (built-in agent or LangGraph) rather
   than shipping a new one.
3. **AG-UI dojo demo** — implements the dojo's `human_in_the_loop` (and optionally
   `tool_based_generative_ui`) feature using MDMA as the rendering layer, with the required
   end-to-end tests.
4. **AG-UI docs/ecosystem entry** — MDMA listed as a generative-UI integration, pointing at the
   package. Exact placement per §8 Q1.
5. **MDMA-side docs** — a short "using MDMA over AG-UI" section referencing the adapter.

## 6. Process (aligned to AG-UI CONTRIBUTING)

1. **Validate first (this document).** Open a GitHub issue proposing MDMA as a generative-UI
   integration; raise it in Discord `#-💎-contributing`. Get explicit direction on home + shape
   before coding the demo.
2. **Build & prove the adapter** against a real agent (approval-gate round trip).
3. **Open the dojo-demo PR** once greenlit: example under the chosen framework, `menu.ts`
   feature entry, and **e2e tests for every feature listed** (non-negotiable per AG-UI —
   "Without tests, your PR will not be considered ready"), plus the CI matrix update in
   `.github/workflows/dojo-e2e.yml`.
4. **Land the docs entry.** File the docs issue, then PR the ecosystem listing.

## 7. Acceptance criteria (definition of done for the demo)

- An AG-UI agent streams an `approval-gate` MDMA document to the frontend.
- It renders live; partial streaming does not wipe user input.
- Approve/deny resumes the agent run (or resolves the interrupt) with state intact.
- An end-to-end test covers the flow and passes locally **and** in CI.
- MDMA appears in AG-UI's ecosystem docs with a working link.

## 8. Open questions — for validation

**For AG-UI maintainers**
1. Where should MDMA be listed? There is no ecosystem category literally named "Generative UI"
   (it's a building block); listings are tiered "Direct to LLM" / "Agent Framework –
   Partnerships / 1st Party / Community". What is the right home for a rendering-spec integration?
2. Is a **dojo demo riding an existing backend** the right vehicle, versus a new
   `integrations/` folder?
3. How is **interrupt / suspend-resume** currently modeled in the dojo's `human_in_the_loop`
   and `interrupt` examples — what contract should the adapter target (`buildResumeArray`,
   `agent.pendingInterrupts`)?
4. Preferred transport to showcase: **text-embedded MDMA** or a **tool call**
   (`tool_based_generative_ui`)?
5. Client API: is persistent `agent.subscribe(subscriber)` preferred over per-run
   `runAgent(params, subscriber)` on the current `@ag-ui/client` line? (Note `runAgent` takes
   `RunAgentParameters`, not a raw input object.)

**For MDMA maintainers**
6. Adapter home — **resolved:** flat `packages/agui/` as `@mobile-reality/mdma-agui`,
   mirroring `packages/mcp/` (which is itself an integration and sits flat, no `adapters/`
   folder). A grouping folder (`integrations/`) is deferred until the flat list grows unwieldy
   (~10+ packages). Confirm this matches maintainer preference.
7. Confirm exact runtime signatures the adapter relies on (all **verified present**):
   `store.updateAst(ast)`, `store.getEventBus().onAny(fn)`, and the action event shapes —
   `ACTION_TRIGGERED { componentId, actionId, payload? }`, `APPROVAL_GRANTED { componentId, actor }`,
   `APPROVAL_DENIED { componentId, actor, reason }`.
8. Should `mdma-prompt-pack` gain an AG-UI-oriented note (which transport to emit)?

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Streaming delivers partial/invalid MDMA YAML | Throttle + `updateAst` + latest-wins; never re-create the store mid-stream. |
| API drift between library versions (the `any` casts) | Structural agent interface isolates coupling to one file; pin peer ranges; `tsc --noEmit` against installed versions. |
| Maintenance burden on AG-UI | Adapter lives in MDMA org; AG-UI gets only docs + demo (contributor-maintained). |
| Maintainers prefer a different home/shape | Resolved by Section 8 **before** building the dojo PR — don't pre-build. |
| MDMA project maturity (small, early v0.x) | Scope is a demo + adapter, not a core dependency; low blast radius either way. |

## 10. Milestones

1. **M0 — Validation.** Issue + Discord; answers to Section 8. *Gate.*
2. **M1 — Adapter.** `mdma-agui` published; approval-gate round-trip proven locally.
3. **M2 — Demo + tests.** Dojo demo PR with e2e tests + CI matrix.
4. **M3 — Docs.** Ecosystem listing in AG-UI; MDMA-side usage docs.
