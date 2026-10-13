---
'@mobile-reality/mdma-prompt-pack': minor
---

Teach the fixer prompt about external data sources. `buildFixerMessage` accepts `dataSources` and appends the same "Available data sources" catalog the author prompt uses, and every fixer variant now repairs `data-source` issues by correcting the `{ source, params }` ref against the catalog instead of generating inline rows, options, or CSV. Without `dataSources` the message is unchanged.
