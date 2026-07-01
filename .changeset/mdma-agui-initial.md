---
"@mobile-reality/mdma-agui": minor
---

Add `@mobile-reality/mdma-agui`: a bridge that renders MDMA interactive documents streamed over
the AG-UI protocol and routes user actions (submit / approve / deny) back into the agent run.
Ships a headless core (`createMdmaAgentBridge`) plus an optional React layer
(`useMdmaAgentStream`, `MdmaAgentView`). AG-UI coupling is isolated to a minimal structural agent
interface, so any `@ag-ui/client` `HttpAgent` works without a hard dependency.
