import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  MdmaDocument,
  darkTheme,
  lightTheme,
  type MdmaTheme,
} from '@mobile-reality/mdma-renderer-react';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { parseMarkdown } from '../../chat/parse-markdown.js';
import { useDemoThemeMode } from '../../theme-context.js';
import { Code } from '../Code.js';
import { Table } from '../Table.js';

/** The five styleable tokens exposed as color pickers in the playground. */
const TOKENS = [
  { key: 'primary', label: 'Accent' },
  { key: 'background', label: 'Background' },
  { key: 'text', label: 'Text' },
  { key: 'textMuted', label: 'Muted' },
  { key: 'border', label: 'Border' },
] as const;

type TokenKey = (typeof TOKENS)[number]['key'];
type Editable = Record<TokenKey, string>;

function pickEditable(theme: MdmaTheme): Editable {
  return {
    primary: theme.colors.primary,
    background: theme.colors.background,
    text: theme.colors.text,
    textMuted: theme.colors.textMuted,
    border: theme.colors.border,
  };
}

/** A small doc that exercises all five tokens: card backgrounds + borders
 *  (background/border), body + header text (text/muted), and the accent
 *  (primary) on the button, checkbox, and input focus. */
const PLAYGROUND_DOC = `\`\`\`mdma
type: form
id: play-form
label: "Create account"
onSubmit: play-submit
fields:
  - name: full-name
    type: text
    label: "Full name"
  - name: notify
    type: checkbox
    label: "Email me product updates"
\`\`\`

\`\`\`mdma
type: button
id: play-button
text: "Get started"
variant: primary
\`\`\`

\`\`\`mdma
type: table
id: play-table
columns:
  - key: plan
    label: "Plan"
    type: text
  - key: seats
    label: "Seats"
    type: number
data:
  - plan: "Starter"
    seats: 3
  - plan: "Team"
    seats: 12
\`\`\``;

interface ThemingCtxValue {
  colors: Editable;
  setColor: (key: TokenKey, value: string) => void;
  reset: () => void;
  theme: MdmaTheme;
  parsed: { ast: MdmaRoot; store: DocumentStore } | null;
}

const ThemingContext = createContext<ThemingCtxValue | null>(null);

function useThemingCtx(): ThemingCtxValue {
  const ctx = useContext(ThemingContext);
  if (!ctx) throw new Error('Theming components must be used within <ThemingProvider>');
  return ctx;
}

/** Holds the live-editor state so the controls (in the docs content) and the
 *  preview (in the right-hand panel) share it. */
export function ThemingProvider({ children }: { children: ReactNode }) {
  const mode = useDemoThemeMode();
  const base = mode === 'dark' ? darkTheme : lightTheme;
  const [colors, setColors] = useState<Editable>(() => pickEditable(base));
  const [parsed, setParsed] = useState<{ ast: MdmaRoot; store: DocumentStore } | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;
    parseMarkdown(PLAYGROUND_DOC).then((result) => {
      if (!cancelRef.current) setParsed(result);
    });
    return () => {
      cancelRef.current = true;
    };
  }, []);

  // Reset the pickers to the built-in palette when the light/dark toggle flips.
  useEffect(() => {
    setColors(pickEditable(mode === 'dark' ? darkTheme : lightTheme));
  }, [mode]);

  const theme: MdmaTheme = useMemo(
    () => ({ ...base, colors: { ...base.colors, ...colors } }),
    [base, colors],
  );

  const value = useMemo<ThemingCtxValue>(
    () => ({
      colors,
      setColor: (key, v) => setColors((c) => ({ ...c, [key]: v })),
      reset: () => setColors(pickEditable(base)),
      theme,
      parsed,
    }),
    [colors, base, theme, parsed],
  );

  return <ThemingContext.Provider value={value}>{children}</ThemingContext.Provider>;
}

/** The color pickers — rendered inline in the docs content. */
function ThemingControls() {
  const { colors, setColor, reset } = useThemingCtx();
  return (
    <div className="theming-pickers">
      {TOKENS.map((t) => (
        <label key={t.key} className="theming-picker">
          <input
            type="color"
            value={colors[t.key]}
            onChange={(e) => setColor(t.key, e.target.value)}
          />
          <span className="theming-picker-label">{t.label}</span>
          <span className="theming-picker-hex">{colors[t.key]}</span>
        </label>
      ))}
      <button type="button" className="theming-swatch-reset" onClick={reset}>
        Reset
      </button>
    </div>
  );
}

/** The live render — shown in the docs right-hand preview panel. */
export function ThemingPreview() {
  const { theme, parsed } = useThemingCtx();
  return (
    <>
      <div className="docs-preview-panel-header">
        <span className="docs-preview-panel-label">Live preview</span>
        <code className="docs-preview-panel-type">theme</code>
      </div>
      <div className="docs-preview-panel-body">
        <div className="docs-preview-panel-render">
          {parsed ? (
            <MdmaDocument ast={parsed.ast} store={parsed.store} theme={theme} />
          ) : (
            <span className="docs-preview-panel-loading">Loading…</span>
          )}
        </div>
      </div>
    </>
  );
}

export function Theming() {
  return (
    <>
      <h2>Theming</h2>
      <p>
        Both renderers ship with a polished default look and a first-class theming layer on top of
        it. Theming is <strong>opt-in</strong>: render a document with no <code>theme</code> and you
        get the built-in light palette, unchanged. When you want more, switch to a dark palette,
        follow the operating-system preference, or hand over a fully custom set of design tokens.
      </p>
      <h2>Try it</h2>
      <p>
        Pick colors for five styleable tokens — <strong>accent</strong>, <strong>background</strong>
        , <strong>text</strong>, <strong>muted</strong>, and <strong>border</strong>. Each one is
        written onto a custom <code>MdmaTheme</code> and the components below re-render instantly.
        Hover a button or focus the input — the hover and focus states derive from your accent
        automatically. Toggle the top-bar theme to reset the pickers to the light or dark palette.
      </p>
      <ThemingControls />

      <h2>The three modes</h2>
      <p>
        Everything is driven by the <code>theme</code> prop on <code>MdmaDocument</code>:
      </p>
      <Table
        headers={['theme value', 'Result']}
        rows={[
          [<em key="o">Default</em>, 'Default light palette — fully backward compatible.'],
          [<code key="l">"light"</code>, 'The built-in light palette.'],
          [<code key="d">"dark"</code>, 'The built-in dark palette.'],
          [<code key="a">"auto"</code>, 'Follows the OS preference (prefers-color-scheme).'],
          [<code key="c">MdmaTheme</code>, 'Your custom tokens.'],
        ]}
      />
      <Code lang="tsx">{`<MdmaDocument ast={ast} store={store} />                 // not themed (default light)
<MdmaDocument ast={ast} store={store} theme="dark" />    // built-in dark
<MdmaDocument ast={ast} store={store} theme="auto" />    // follow the OS
<MdmaDocument ast={ast} store={store} theme={myTheme} /> // custom`}</Code>

      <h2>The MdmaTheme token shape</h2>
      <p>A theme is a plain object. This is the whole contract:</p>
      <Code lang="ts">{`interface MdmaTheme {
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
    info: string;      infoBg: string;
    warning: string;   warningBg: string;
    error: string;     errorBg: string;
    success: string;   successBg: string;
  };
  spacing: { xs: number; sm: number; md: number; lg: number };
  radius: { sm: number; md: number };
  fontSize: { small: number; body: number; label: number; title: number };
}`}</Code>
      <p>
        The <code>lightTheme</code> and <code>darkTheme</code> presets are exported from both
        renderer packages, so the easiest way to build a custom theme is to spread a preset and
        override just what you need (exactly what the playground above does):
      </p>
      <Code lang="ts">{`import { lightTheme, type MdmaTheme } from '@mobile-reality/mdma-renderer-react';

const brandTheme: MdmaTheme = {
  ...lightTheme,
  colors: { ...lightTheme.colors, primary: '#e91e63', onPrimary: '#ffffff' },
  radius: { sm: 10, md: 16 },
};`}</Code>

      <h2>Web renderer</h2>
      <p>
        Import the stylesheet once, then pass a <code>theme</code>:
      </p>
      <Code lang="tsx">{`import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import '@mobile-reality/mdma-renderer-react/styles.css';

<MdmaDocument ast={ast} store={store} theme="auto" />;`}</Code>
      <p>
        Under the hood the stylesheet expresses every color, radius, and size as a{' '}
        <code>--mdma-*</code> CSS variable scoped to <code>.mdma-document</code>. Built-in palettes
        apply via a <code>data-theme</code> attribute; a custom <code>MdmaTheme</code> is written as
        inline CSS variables. Because it&apos;s all CSS variables, you can theme{' '}
        <strong>without the prop at all</strong> — just set the variables in your own CSS:
      </p>
      <Code lang="css">{`.mdma-document {
  --mdma-color-primary: #e91e63;
  --mdma-radius-md: 16px;
}`}</Code>
      <p>
        A <code>MdmaDocument</code> with no <code>theme</code> of its own inherits the theme from an
        ancestor <code>MdmaThemeProvider</code>, so one provider can theme a whole app. Rendering a
        lone <code>&lt;MdmaBlock&gt;</code> outside <code>MdmaDocument</code>? Wrap it so the
        variables cascade:
      </p>
      <Code lang="tsx">{`import { MdmaThemeProvider, MdmaBlock } from '@mobile-reality/mdma-renderer-react';

<MdmaThemeProvider theme="dark">
  <MdmaBlock block={block} />
</MdmaThemeProvider>;`}</Code>

      <h2>Vue renderer</h2>
      <p>
        The Vue renderer (<code>@mobile-reality/mdma-renderer-vue</code>) ships the{' '}
        <strong>same <code>styles.css</code></strong> and the same <code>MdmaTheme</code> token
        shape, so everything above applies unchanged — only the syntax differs. One difference:{' '}
        <code>useMdmaTheme()</code> returns a <code>ComputedRef</code>, so read it as{' '}
        <code>theme.value.colors.primary</code> to stay reactive.
      </p>
      <Code lang="vue">{`<script setup lang="ts">
import { MdmaDocument } from '@mobile-reality/mdma-renderer-vue';
import '@mobile-reality/mdma-renderer-vue/styles.css';
</script>

<template>
  <!-- 'light' | 'dark' | 'auto', or a full MdmaTheme object -->
  <MdmaDocument :ast="ast" :store="store" theme="dark" />
</template>`}</Code>

      <h2>React Native renderer</h2>
      <p>
        Same prop, no stylesheet — each renderer builds its <code>StyleSheet</code> from the
        resolved tokens, which any custom component can read with <code>useMdmaTheme()</code>:
      </p>
      <Code lang="tsx">{`import { MdmaDocument, useMdmaTheme } from '@mobile-reality/mdma-renderer-react-native';

<MdmaDocument ast={ast} store={store} theme="auto" />;

function Badge() {
  const theme = useMdmaTheme();
  return <View style={{ backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm }} />;
}`}</Code>
    </>
  );
}
