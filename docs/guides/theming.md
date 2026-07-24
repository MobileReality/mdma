# Theming

MDMA renderers ship with a polished default look and a first-class theming layer on top of it. Theming is **opt-in**: render a document with no `theme` and you get the built-in light palette, unchanged. When you want more, you can switch to a dark palette, follow the operating-system preference, or hand over a fully custom set of design tokens.

The web renderers (`@mobile-reality/mdma-renderer-react` and `@mobile-reality/mdma-renderer-vue`) and the React Native renderer (`@mobile-reality/mdma-renderer-react-native`) all expose the **same `MdmaTheme` token shape**, so a custom theme object is portable between them. The two web renderers also ship an identical `styles.css`.

## The three modes

Everything is driven by the `theme` prop on `MdmaDocument`:

| `theme` value        | Result                                                        |
| -------------------- | ------------------------------------------------------------- |
| *(omitted)*          | Default light palette. No behavior change — fully backward compatible. |
| `"light"` / `"dark"` | The built-in light or dark palette.                           |
| `"auto"`             | Follows the OS preference (`prefers-color-scheme` on web, `useColorScheme()` on native). |
| `MdmaTheme` object   | Your custom tokens.                                           |

```tsx
<MdmaDocument ast={ast} store={store} />               // not themed (default light)
<MdmaDocument ast={ast} store={store} theme="dark" />  // built-in dark
<MdmaDocument ast={ast} store={store} theme="auto" />  // follow the OS
<MdmaDocument ast={ast} store={store} theme={myTheme} />// custom
```

## The `MdmaTheme` token shape

A theme is a plain object. This is the whole contract:

```ts
interface MdmaTheme {
  colors: {
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    onPrimary: string;
    secondary: string;
    onSecondary: string;
    danger: string;
    onDanger: string;
    // Callout accents + soft backgrounds
    info: string;
    infoBg: string;
    warning: string;
    warningBg: string;
    error: string;
    errorBg: string;
    success: string;
    successBg: string;
  };
  spacing: { xs: number; sm: number; md: number; lg: number };
  radius: { sm: number; md: number };
  fontSize: { small: number; body: number; label: number; title: number };
}
```

The `lightTheme` and `darkTheme` presets are exported from both renderer packages, so the easiest way to build a custom theme is to spread a preset and override just what you need:

```ts
import { lightTheme, type MdmaTheme } from '@mobile-reality/mdma-renderer-react';

const brandTheme: MdmaTheme = {
  ...lightTheme,
  colors: { ...lightTheme.colors, primary: '#e91e63', onPrimary: '#ffffff' },
  radius: { sm: 10, md: 16 },
};
```

## Web renderer

Import the stylesheet once, then pass a `theme`:

```tsx
import { MdmaDocument, lightTheme } from '@mobile-reality/mdma-renderer-react';
import '@mobile-reality/mdma-renderer-react/styles.css';

<MdmaDocument ast={ast} store={store} theme="auto" />;
```

### How it works — CSS variables

The stylesheet expresses every color, radius, and size as a `--mdma-*` CSS custom property scoped to `.mdma-document`. The defaults are the light palette, so importing the CSS with no theme renders exactly as before.

- `theme="light" | "dark" | "auto"` sets a `data-theme` attribute on the document root; the stylesheet swaps the palette (and `"auto"` is gated behind a `prefers-color-scheme` media query).
- A custom `MdmaTheme` object is written as inline CSS variables on the root, overriding the defaults.

Because it's all CSS variables, you can also theme **without touching the `theme` prop** — just set the variables in your own CSS:

```css
.mdma-document {
  --mdma-color-primary: #e91e63;
  --mdma-radius-md: 16px;
}
```

The public color tokens map to `--mdma-color-<kebab-case>` (e.g. `onPrimary` → `--mdma-color-on-primary`, `infoBg` → `--mdma-color-info-bg`); numeric scales become `--mdma-radius-*`, `--mdma-spacing-*`, and `--mdma-font-size-*` in pixels.

### Rendering blocks without `MdmaDocument`

If you render a lone `<MdmaBlock>` outside of `MdmaDocument`, wrap it in `MdmaThemeProvider` so the variables cascade:

```tsx
import { MdmaThemeProvider, MdmaBlock } from '@mobile-reality/mdma-renderer-react';

<MdmaThemeProvider theme="dark">
  <MdmaBlock block={block} />
</MdmaThemeProvider>;
```

## Vue renderer

The Vue renderer uses the same stylesheet and the same tokens, so everything above applies unchanged — only the syntax differs:

```vue
<script setup lang="ts">
import { MdmaDocument, type MdmaTheme } from '@mobile-reality/mdma-renderer-vue';
import '@mobile-reality/mdma-renderer-vue/styles.css';
</script>

<template>
  <!-- 'light' | 'dark' | 'auto', or a full MdmaTheme object -->
  <MdmaDocument :ast="ast" :store="store" theme="dark" />
</template>
```

Rendering a lone block outside a document works the same way, via `MdmaThemeProvider`:

```vue
<MdmaThemeProvider theme="dark">
  <MdmaBlock :block="block" />
</MdmaThemeProvider>
```

One difference: `useMdmaTheme()` returns a `ComputedRef`, so read tokens as `theme.value.colors.primary` in `setup` (or unwrapped in a template) — that is what keeps them reactive when an ancestor's theme changes.

## React Native renderer

```tsx
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react-native';

<MdmaDocument ast={ast} store={store} theme="auto" />;
```

`MdmaDocument` wraps its children in an `MdmaThemeProvider`. There is no stylesheet — each renderer builds its `StyleSheet` from the resolved tokens, which any custom component can read with `useMdmaTheme()`:

```tsx
import { useMdmaTheme } from '@mobile-reality/mdma-renderer-react-native';

function Badge() {
  const theme = useMdmaTheme();
  return <View style={{ backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm }} />;
}
```

## Notes

- **Portability.** The `colors`/`spacing`/`radius`/`fontSize` shape is identical across renderers, so a shared theme object can drive both your web and native apps. The built-in `lightTheme`/`darkTheme` *values* differ slightly per platform to match each renderer's native look.
- **Backward compatible.** Existing code that never sets `theme` is unaffected — the default light palette is the previous look.
- **Presentation stays in the renderer.** Themes live entirely in the renderers; the MDMA spec and prompts never describe appearance, so the same document renders under any theme.
