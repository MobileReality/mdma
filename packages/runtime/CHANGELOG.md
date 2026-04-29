# @mobile-reality/mdma-runtime

## 0.2.1

### Patch Changes

- f6ae6c5: Serialize File instances in FIELD_CHANGED payloads before audit-log append and redaction, so uploaded files keep { name, size, type, lastModified } in the trail instead of being JSON-flattened to {}. Exports a new serializeFiles helper for consumers (e.g. UI subscribers on eventBus) that need the same conversion.
- Updated dependencies [9ba720a]
  - @mobile-reality/mdma-spec@0.2.1

## 0.2.0

### Major Changes

- 4d37c6d: Added validator to the project
