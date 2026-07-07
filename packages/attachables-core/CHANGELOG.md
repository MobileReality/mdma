# @mobile-reality/mdma-attachables-core

## 0.2.5

### Patch Changes

- Updated dependencies [d55f0ab]
  - @mobile-reality/mdma-runtime@0.3.1
  - @mobile-reality/mdma-spec@0.3.1

## 0.2.4

### Patch Changes

- b03ad21: Remove the unused `onAction` methods from the core attachable handlers (form, button, tasklist,
  table, callout, approval-gate, webhook). They were never invoked — renderers dispatch store actions
  directly — so this is a dead-code cleanup with no behavioral change. Each handler's `definition` and
  `initialize` are unchanged.
- Updated dependencies [b03ad21]
- Updated dependencies [d262328]
  - @mobile-reality/mdma-runtime@0.3.0

## 0.2.3

### Patch Changes

- 019778a: Tests update
- Updated dependencies [5bb8529]
  - @mobile-reality/mdma-spec@0.3.0
  - @mobile-reality/mdma-runtime@0.2.3

## 0.2.2

### Patch Changes

- d972139: Add npm keywords for discoverability
- Updated dependencies [d972139]
  - @mobile-reality/mdma-runtime@0.2.2
  - @mobile-reality/mdma-spec@0.2.2

## 0.2.1

### Patch Changes

- Updated dependencies [f6ae6c5]
- Updated dependencies [9ba720a]
  - @mobile-reality/mdma-runtime@0.2.1
  - @mobile-reality/mdma-spec@0.2.1

## 0.1.1

### Patch Changes

- Updated dependencies [4d37c6d]
  - @mobile-reality/mdma-runtime@1.0.0
