import { Code } from '../Code.js';

export function Vue() {
  return (
    <>
      <h2>Vue</h2>
      <p>
        <code>@mobile-reality/mdma-renderer-vue</code> renders MDMA documents as Vue 3 UI — the Vue
        sibling of <code>@mobile-reality/mdma-renderer-react</code>. It consumes the same headless{' '}
        <code>spec</code> + <code>runtime</code> stack unchanged and mirrors the React renderer's
        public surface name for name (a test asserts export parity). It ships the{' '}
        <strong>same <code>styles.css</code></strong> as the web React renderer, so a theme object
        and a set of <code>.mdma-*</code> styles are portable between the two.
      </p>

      <h2>Install</h2>
      <Code lang="bash">{`npm install @mobile-reality/mdma-renderer-vue \\
  @mobile-reality/mdma-spec @mobile-reality/mdma-runtime vue`}</Code>

      <h2>Usage</h2>
      <p>
        Parse a document to an AST + store (with <code>@mobile-reality/mdma-parser</code>), import
        the stylesheet once, then hand both to <code>MdmaDocument</code>.
      </p>
      <Code lang="vue">{`<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-vue';
import '@mobile-reality/mdma-renderer-vue/styles.css';

const props = defineProps<{ markdown: string }>();
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdma, {});
const doc = ref<{ ast: any; store: any } | null>(null);

watchEffect(async () => {
  const ast = await processor.run(processor.parse(props.markdown), props.markdown);
  doc.value = { ast, store: createDocumentStore(ast) };
});
</script>

<template>
  <MdmaDocument v-if="doc" :ast="doc.ast" :store="doc.store" />
</template>`}</Code>

      <h2>Differences from the React renderer</h2>
      <p>
        The API is the same shape in Vue idiom, with a few deliberate differences:
      </p>
      <ul>
        <li>
          <strong>Composables return refs.</strong> <code>useMdmaTheme()</code>,{' '}
          <code>useComponentState()</code>, <code>useBinding()</code> return a{' '}
          <code>ComputedRef</code>, so they stay reactive — read <code>.value</code> in{' '}
          <code>setup</code> (unwrapped in a template).
        </li>
        <li>
          <strong>Context is provide/inject.</strong> <code>MdmaProvider</code> and the theme /
          element-override / custom-variant providers use Vue <code>provide</code>/
          <code>inject</code> with exported <code>InjectionKey</code>s instead of React context.
        </li>
        <li>
          <strong>Custom renderers spread a runtime prop declaration.</strong> Spread{' '}
          <code>blockRendererProps</code> into your <code>defineComponent</code> so Vue passes the
          props through instead of dropping them on the root element as attributes.
        </li>
      </ul>
      <p>
        Components are authored as <code>defineComponent</code> + <code>h()</code> render functions
        in plain <code>.ts</code> — no <code>.vue</code> SFCs — so the package builds with{' '}
        <code>tsc</code> and needs no bundler.
      </p>

      <h2>Styling &amp; theming</h2>
      <p>
        Import <code>styles.css</code> once and pass a <code>theme</code> prop (
        <code>"light" | "dark" | "auto"</code>, or a full <code>MdmaTheme</code> token object) to{' '}
        <code>MdmaDocument</code>. To theme a lone <code>MdmaBlock</code> rendered outside a
        document, wrap it in <code>MdmaThemeProvider</code>. Because the tokens and stylesheet match
        the React renderer, a theme built on one renders identically on the other.
      </p>

      <h2>Customizing components</h2>
      <p>
        Override any built-in component through <code>customizations.components.&lt;type&gt;</code>,
        or draw a host-registered <code>custom</code> block through{' '}
        <code>customizations.customVariants</code>. For example, swap the built-in chart (which
        draws a table) for a real one:
      </p>
      <Code lang="ts">{`import { defineComponent, h } from 'vue';
import { MdmaDocument, blockRendererProps } from '@mobile-reality/mdma-renderer-vue';

const MyChartRenderer = defineComponent({
  props: blockRendererProps,
  setup(props) {
    // props.component is the chart block; draw it however you like.
    return () => h('div', props.component.id);
  },
});

// <MdmaDocument :ast :store :customizations="{ components: { chart: MyChartRenderer } }" />`}</Code>

      <p>
        A runnable example — an OpenRouter-backed agent chat that renders streamed MDMA replies,
        with a 2D-chart override and a three.js <code>graph-3d</code> custom component — lives in the
        repo at <code>examples/renderers/mdma-vue</code>.
      </p>
    </>
  );
}
