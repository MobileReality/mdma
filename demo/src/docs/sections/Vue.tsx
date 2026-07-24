import { Code } from '../Code.js';

export function Vue() {
  return (
    <>
      <h2>Vue</h2>
      <p>
        <code>@mobile-reality/mdma-renderer-vue</code> turns a parsed MDMA document into interactive
        Vue 3 components — forms, tables, charts, approval gates, and the rest of the component
        catalog — with full state, bindings, actions, policy, audit, and PII redaction. It builds on
        the headless <code>spec</code> + <code>runtime</code> stack: you give it an AST and a
        document store, and it renders the live UI and dispatches user interactions back into the
        store.
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

      <h2>State &amp; reactivity</h2>
      <p>
        Read document state through composables, each of which returns a <code>ComputedRef</code> so
        your components re-render as the store changes: <code>useComponentState(id)</code> for one
        component's values, <code>useBinding(expr)</code> to resolve a <code>{'{{ binding }}'}</code>{' '}
        expression, and <code>useDocumentState()</code> for the whole document. Read them as{' '}
        <code>.value</code> in <code>setup</code>, or unwrapped in a template.
      </p>
      <Code lang="vue">{`<script setup lang="ts">
import { useBinding } from '@mobile-reality/mdma-renderer-vue';

const email = useBinding<string>('{{ signup.email }}');
</script>

<template>
  <p>Welcome, {{ email }}</p>
</template>`}</Code>
      <p>
        Providers use Vue's <code>provide</code>/<code>inject</code>: <code>MdmaDocument</code> wires
        the store, theme, element overrides, and custom variants for everything beneath it. To render
        a lone <code>MdmaBlock</code> outside a document, wrap it in <code>MdmaProvider</code> (store)
        and <code>MdmaThemeProvider</code> (theme).
      </p>

      <h2>Styling &amp; theming</h2>
      <p>
        Import <code>styles.css</code> once — it is driven by <code>--mdma-*</code> CSS variables, so
        every component is themeable without touching markup. Pass a <code>theme</code> prop to{' '}
        <code>MdmaDocument</code>: <code>"light"</code>, <code>"dark"</code>, <code>"auto"</code> (it
        follows the OS preference), or a full <code>MdmaTheme</code> token object for custom colors,
        spacing, radii, and type. The <strong>Theming</strong> page has a live editor.
      </p>

      <h2>Customizing components</h2>
      <p>
        Override any built-in component through <code>customizations.components.&lt;type&gt;</code>,
        or draw a host-registered <code>custom</code> block through{' '}
        <code>customizations.customVariants</code>. A custom renderer spreads the exported{' '}
        <code>blockRendererProps</code> declaration so Vue passes the component, its state, and the
        dispatch/binding callbacks through as props. For example, swap the built-in chart (which
        draws a plain table so the library stays lightweight) for a real one:
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
