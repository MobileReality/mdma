# Notes — renderer-vue

Scratch reasoning for the final explainer. Append only: never edit or remove an earlier
block, even one that turned out wrong — add a later block correcting it instead.
Deleted in the explainer commit.

## 1 — Scaffold package (221d298)

- Why: the package stays on the workspace's plain `tsc` toolchain, so it needs no build step of its own — `lib: ["ES2022", "DOM"]` is the only tsconfig deviation from `renderer-react`, which gets its DOM types transitively from `@types/react`.
- Instead of: `.vue` SFCs. They'd require `vue-tsc` plus a bundler, making this the only package in the repo that can't be built by `tsc -p` or linted by biome. `h()` render functions cost verbosity in `FormRenderer`/`MdastRenderer` and buy toolchain uniformity everywhere else.
- Surprise: the scaffold test is not ceremony — it's the only thing proving happy-dom + `@vue/test-utils` actually render, since every other package's tests are DOM-free.
