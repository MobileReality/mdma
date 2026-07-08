import { Code } from '../Code.js';

export function ReactWeb() {
  return (
    <>
      <h2>React</h2>
      <p>
        <code>@mobile-reality/mdma-renderer-react</code> renders MDMA documents as web UI — every
        live example on this site is produced by it. It consumes the headless <code>spec</code> +{' '}
        <code>runtime</code> stack unchanged and turns a parsed document into interactive React
        components with full state, bindings, actions, policy, audit, and PII redaction.
      </p>

      <h2>Install</h2>
      <Code lang="bash">{`npm install @mobile-reality/mdma-renderer-react \\
  @mobile-reality/mdma-spec @mobile-reality/mdma-runtime react`}</Code>

      <h2>Usage</h2>
      <p>
        Parse a document to an AST + store (with <code>@mobile-reality/mdma-parser</code>), import
        the stylesheet once, then hand both to <code>MdmaDocument</code>.
      </p>
      <Code lang="tsx">{`import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import '@mobile-reality/mdma-renderer-react/styles.css';

const processor = unified().use(remarkParse).use(remarkMdma, {});

export function Document({ markdown }: { markdown: string }) {
  const [doc, setDoc] = useState(null);
  useEffect(() => {
    (async () => {
      const ast = await processor.run(processor.parse(markdown), markdown);
      setDoc({ ast, store: createDocumentStore(ast) });
    })();
  }, [markdown]);

  if (!doc) return null;
  return <MdmaDocument ast={doc.ast} store={doc.store} />;
}`}</Code>

      <h2>Styling &amp; theming</h2>
      <p>
        The imported <code>styles.css</code> is driven by <code>--mdma-*</code> CSS variables. Pass
        a <code>theme</code> prop (<code>"light" | "dark" | "auto"</code>, or a full token object)
        to <code>MdmaDocument</code> — the <strong>Theming</strong> page has a live editor.
      </p>

      <h2>Customizing components</h2>
      <p>
        Override any built-in component through <code>customizations.components.&lt;type&gt;</code>.
        For example, the built-in chart renderer draws data as a plain table so the library stays
        lightweight — swap in a real chart with a custom renderer:
      </p>
      <Code lang="tsx">{`import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import { MyRechartsRenderer } from './MyRechartsRenderer';

function App({ ast, store }) {
  return (
    <MdmaDocument
      ast={ast}
      store={store}
      customizations={{ components: { chart: MyRechartsRenderer } }}
    />
  );
}`}</Code>
    </>
  );
}
