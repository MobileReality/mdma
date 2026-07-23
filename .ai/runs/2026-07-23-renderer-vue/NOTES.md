# Notes — renderer-vue

Scratch reasoning for the final explainer. Append only: never edit or remove an earlier
block, even one that turned out wrong — add a later block correcting it instead.
Deleted in the explainer commit.

## 1 — Scaffold package (a793535)

- Why: the package stays on the workspace's plain `tsc` toolchain, so it needs no build step of its own — `lib: ["ES2022", "DOM"]` is the only tsconfig deviation from `renderer-react`, which gets its DOM types transitively from `@types/react`.
- Instead of: `.vue` SFCs. They'd require `vue-tsc` plus a bundler, making this the only package in the repo that can't be built by `tsc -p` or linted by biome. `h()` render functions cost verbosity in `FormRenderer`/`MdastRenderer` and buy toolchain uniformity everywhere else.
- Surprise: the scaffold test is not ceremony — it's the only thing proving happy-dom + `@vue/test-utils` actually render, since every other package's tests are DOM-free.

## 2 — Port styles.css (86f9135)

- Why: copied byte-for-byte from `renderer-react` rather than trimmed or restyled, because the promise is theme portability — the same `MdmaTheme` object must render identically through either renderer.
- Instead of: depending on `@mobile-reality/mdma-renderer-react` for its stylesheet, which would make a Vue app install React to get a CSS file.
- Surprise: the duplication is load-bearing, so it's guarded by a test that diffs the two files. Editing one alone fails the Vue suite — that's the intended tripwire, not a nuisance.

## 3 — Theme module (PENDING)

- Why: `useMdmaTheme()` returns a `ComputedRef`, not a plain object like the React version. A Vue composable that returned a snapshot would silently stop tracking when an ancestor's `theme` prop changes — parity of *names* matters less than parity of *behavior*.
- Instead of: providing the raw `MdmaTheme`. The injected value is the whole `ResolvedThemeProps` (data-theme + inline vars + tokens) so a nested `MdmaDocument` with no `theme` of its own can re-apply the ancestor's presentation to its own root — the same reason the React context holds the resolved props.
- Surprise: `resolveThemeProps` derives `data-theme` from a custom theme's *background luminance*. That's not decoration — the stylesheet has internal derived vars (heading text, code backgrounds) outside the public token type, and picking the wrong base renders dark-on-dark.
