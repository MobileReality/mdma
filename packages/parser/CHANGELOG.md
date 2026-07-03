# @mobile-reality/mdma-parser

## 0.2.4

### Patch Changes

- d262328: Stop flashing "Unknown component type" while a block is still streaming. When an `mdma` fence is
  not yet closed, a valid-YAML-but-unknown type (e.g. a half-streamed `approval-gat` before
  `approval-gate` finishes) is now left as a pending block (loading skeleton) instead of being
  rendered as an unknown-type error. Once the fence closes, a genuinely unknown type still surfaces
  the error as before. Known valid types continue to render live during streaming. The `mdma-agui`
  adapter now threads the source into `unified.run()` so the parser can see the raw fences.

## 0.2.3

### Patch Changes

- 019778a: Tests update
- Updated dependencies [5bb8529]
  - @mobile-reality/mdma-spec@0.3.0

## 0.2.2

### Patch Changes

- d972139: Add npm keywords for discoverability
- Updated dependencies [d972139]
  - @mobile-reality/mdma-spec@0.2.2

## 0.2.1

### Patch Changes

- Updated dependencies [9ba720a]
  - @mobile-reality/mdma-spec@0.2.1

## 0.2.0

### Major Changes

- 4d37c6d: Added validator to the project
