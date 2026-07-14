---
'@mobile-reality/mdma-agui': minor
---

Track the agent's shared state (`STATE_SNAPSHOT` / `STATE_DELTA`, including JSON-patch deltas) as a
`componentId → values` map, exposed via the `onState` option and `bridge.state`, and use it to
hydrate MDMA stores. MDMA components are headless — a document describes intent and takes its values
from state — so this is what lets a form the agent renders come up **pre-filled** from what it
already knows.

Hydration is **reactive**: state arriving *after* a component is already on screen is dispatched into
that live store too, so the agent can set a field the user is currently looking at without
re-rendering the component.
