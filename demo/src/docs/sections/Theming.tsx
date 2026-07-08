import { Code } from '../Code.js';
import { Table } from '../Table.js';

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
      <p>
        The web renderer (<code>@mobile-reality/mdma-renderer-react</code>) and the React Native
        renderer (<code>@mobile-reality/mdma-renderer-react-native</code>) expose the{' '}
        <strong>
          same <code>MdmaTheme</code> token shape
        </strong>
        , so a custom theme object is portable between the two.
      </p>
      <p className="docs-tagline">
        The <strong>☀️ / 🌙 / 🖥️</strong> toggle in the top bar themes every live example on this site
        — including the components and the React Native preview.
      </p>

      <h2>The three modes</h2>
      <p>
        Everything is driven by the <code>theme</code> prop on <code>MdmaDocument</code>:
      </p>
      <Table
        headers={['theme value', 'Result']}
        rows={[
          [<em key="o">(omitted)</em>, 'Default light palette — fully backward compatible.'],
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
        override just what you need:
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

      <h2>Notes</h2>
      <p>
        <strong>Portable.</strong> The <code>colors</code> / <code>spacing</code> /{' '}
        <code>radius</code> / <code>fontSize</code> shape is identical across renderers, so one
        theme object can drive both your web and native apps — and the built-in{' '}
        <code>lightTheme</code> / <code>darkTheme</code> palettes now match across the two.
      </p>
      <p>
        <strong>Backward compatible.</strong> Existing code that never sets <code>theme</code> is
        unaffected — the default light palette is the previous look.
      </p>
      <p>
        <strong>Presentation stays in the renderer.</strong> Themes live entirely in the renderers;
        the MDMA spec and prompts never describe appearance, so the same document renders under any
        theme.
      </p>
    </>
  );
}
