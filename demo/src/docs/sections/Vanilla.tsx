import { Code } from '../Code.js';

export function Vanilla() {
  return (
    <>
      <h2>Vanilla JS</h2>
      <p>
        <code>@mobile-reality/mdma-renderer-vanilla</code> renders MDMA documents with no framework
        — plain DOM, no React, no Vue. It draws the same ten component types with the same{' '}
        <code>.mdma-*</code> class names and the same <code>styles.css</code> as the React and Vue
        renderers, on top of the headless <code>spec</code> + <code>runtime</code> stack: you give
        it an AST and a document store, and it mounts the live UI into a container and dispatches
        user interactions back into the store. Reach for it when the host has no framework — a
        static page, a CMS template, a web-component wrapper — or one MDMA shouldn&apos;t dictate.
      </p>

      <h2>Install</h2>
      <Code lang="bash">{'npm install @mobile-reality/mdma-renderer-vanilla'}</Code>

      <h2>Usage</h2>
      <p>
        Parse a document to an AST + store (with <code>@mobile-reality/mdma-parser</code>), import
        the stylesheet once, then mount it into any element with <code>mountMdmaDocument</code>.
      </p>
      <Code lang="ts">{`import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { AttachableRegistry, createDocumentStore } from '@mobile-reality/mdma-runtime';
import { registerAllCoreAttachables } from '@mobile-reality/mdma-attachables-core';
import { mountMdmaDocument } from '@mobile-reality/mdma-renderer-vanilla';
import '@mobile-reality/mdma-renderer-vanilla/styles.css';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdma, {});
const ast = await processor.run(processor.parse(markdown), markdown);

const registry = new AttachableRegistry();
registerAllCoreAttachables(registry);
const store = createDocumentStore(ast, { registry });

const doc = mountMdmaDocument(document.getElementById('app')!, { ast, store, theme: 'auto' });`}</Code>

      <h2>The document handle</h2>
      <p>
        <code>mountMdmaDocument(container, options)</code> returns a handle instead of a component.
        It subscribes to the store itself, so a dispatch from any component re-renders the document
        without any wiring on your side.
      </p>
      <Code lang="ts">{`doc.el;                      // the .mdma-document root element
doc.update({ ast: next });   // apply a new ast, store, customizations, or theme — omitted fields are kept
doc.destroy();               // unsubscribe from the store and detach`}</Code>

      <h2>Streaming</h2>
      <p>
        This is the part a framework normally does for you. A streamed model reply re-parses on
        every chunk, so <code>update({'{ ast }'})</code> receives a brand-new AST many times a
        second — while the user may already be typing into a form the document drew. There is no
        virtual DOM to diff, and rebuilding the document on every chunk would blur the focused input
        and throw away what the user typed. So the renderer reconciles in place instead: each
        renderer owns its element and is re-fed props, and decides what to touch.
      </p>
      <ul>
        <li>
          <strong>Form inputs are updated in place</strong>, and <code>setInputValue</code> refuses
          to write to a focused field — a half-typed value and the caret position survive every
          re-parse.
        </li>
        <li>
          <strong>Nodes move only when the order actually changed.</strong> Re-appending a node that
          is already in position would detach it, and detaching blurs a focused input.
        </li>
        <li>
          <strong>A block that has parsed once is kept</strong>, so a complete fence that briefly
          reverts to a pending code node mid-stream doesn&apos;t flicker back to a loading skeleton.
        </li>
        <li>
          <strong>Blocks are keyed by id and type</strong>, so a truncated type (
          <code>approval-gat</code> → <code>approval-gate</code>) re-mounts into the right renderer
          instead of updating the wrong one.
        </li>
        <li>
          <strong>
            A <code>thinking</code> block streams its content live
          </strong>{' '}
          rather than sitting behind a skeleton.
        </li>
      </ul>

      <h2>Styling &amp; theming</h2>
      <p>
        Import <code>styles.css</code> once — it is byte-identical to the React and Vue
        renderers&apos; stylesheet, driven by <code>--mdma-*</code> CSS variables. Pass{' '}
        <code>theme</code> to <code>mountMdmaDocument</code> (or later through <code>update</code>):{' '}
        <code>"light"</code>, <code>"dark"</code>, <code>"auto"</code> (it follows the OS
        preference), or a full <code>MdmaTheme</code> token object. Built-in palettes apply as a{' '}
        <code>data-theme</code> attribute, a custom theme as inline CSS variables. The{' '}
        <strong>Theming</strong> page has a live editor.
      </p>

      <h2>Customizing components</h2>
      <p>
        Replace a built-in renderer or one of its sub-elements through{' '}
        <code>customizations.components</code>, draw host-registered <code>custom</code> blocks
        through <code>customizations.customVariants</code>, and supply form field options through{' '}
        <code>customizations.dataSources</code>:
      </p>
      <Code lang="ts">{`mountMdmaDocument(container, {
  ast,
  store,
  theme: 'dark',
  customizations: {
    components: {
      chart: MyChartRenderer,                    // replace a built-in renderer
      form: { elements: { input: GlassInput } }, // or just one sub-element
    },
    customVariants: { 'graph-3d': Graph3D },     // draw \`type: custom\` blocks
    dataSources: { countries: [{ label: 'Poland', value: 'pl' }] },
  },
});`}</Code>
      <p>
        A renderer is a function that returns an instance — an element plus an{' '}
        <code>update(props)</code> that is re-fed on every store or AST change, and an optional{' '}
        <code>destroy()</code>. For example, swap the built-in chart (which draws a plain table so
        the library stays lightweight) for a real one:
      </p>
      <Code lang="ts">{`import { el, type MdmaBlockRenderer } from '@mobile-reality/mdma-renderer-vanilla';

const MyChartRenderer: MdmaBlockRenderer = (initial) => {
  const root = el('div', { class: 'my-chart' });
  return {
    el: root,
    update(props) { /* props.component is the chart block; mutate what changed */ },
    destroy() { /* optional cleanup */ },
  };
};`}</Code>
      <p>
        When nothing needs preserving between renders, <code>stateless(props =&gt; element)</code>{' '}
        writes the instance for you and rebuilds on each update;{' '}
        <code>withState(createState, (props, state) =&gt; element)</code> does the same while
        keeping view state (a revealed PII cell, a fired webhook) across rebuilds.
      </p>
    </>
  );
}
