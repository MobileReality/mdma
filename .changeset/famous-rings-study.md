---
"@mobile-reality/mdma-runtime": patch
---

Serialize File instances in FIELD_CHANGED payloads before audit-log append and redaction, so uploaded files keep { name, size, type, lastModified } in the trail instead of being JSON-flattened to {}. Exports a new serializeFiles helper for consumers (e.g. UI subscribers on eventBus) that need the same conversion.
