import { Code } from '../Code.js';

// ── Static Expo Snack — a keyless chat that renders MDMA documents natively ──
// The sample documents are PRE-PARSED here (at build time) and embedded as ASTs,
// so the Snack imports only `runtime` + `renderer-react-native` — no unified /
// remark / micromark. That keeps the Snack bundle small so it starts reliably.

const A1 = {"type":"root","children":[{"type":"paragraph","children":[{"type":"text","value":"Here you go:"}]},{"type":"mdmaBlock","component":{"id":"contact-form","type":"form","sensitive":false,"disabled":false,"visible":true,"fields":[{"name":"full_name","type":"text","label":"Full Name","required":true,"sensitive":false},{"name":"email","type":"email","label":"Email","required":true,"sensitive":true},{"name":"message","type":"textarea","label":"Message","required":false,"sensitive":false}],"onSubmit":"submit-contact"}}]};

const A2 = {"type":"root","children":[{"type":"mdmaBlock","component":{"id":"preflight","type":"tasklist","label":"Pre-flight","sensitive":false,"disabled":false,"visible":true,"items":[{"id":"tests","text":"All tests green","checked":false,"required":false},{"id":"docs","text":"Docs updated","checked":false,"required":false}],"onComplete":"preflight-done"}},{"type":"mdmaBlock","component":{"id":"gate","type":"approval-gate","sensitive":false,"disabled":false,"visible":true,"title":"Ship v1.0","description":"Approve to cut the release.","requiredApprovers":1,"onApprove":"do-release","onDeny":"hold-release","requireReason":false}}]};

const SNACK_CHAT = [
  { role: 'user', text: 'Make me a contact form' },
  { role: 'assistant', ast: A1 },
  { role: 'user', text: 'Add a release checklist and an approval gate' },
  { role: 'assistant', ast: A2 },
];

// The Snack program. The chat (with pre-parsed ASTs) is injected as JSON via
// interpolation, so there are no backticks or escaped newlines to manage.
const SNACK_CODE = `// MDMA — React Native renderer (static demo, no API key needed)
if (!global.crypto) global.crypto = {};
if (typeof global.crypto.randomUUID !== "function") {
  // mdma-runtime uses crypto.randomUUID(); Hermes doesn't provide it.
  global.crypto.randomUUID = function () {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (ch) {
      var r = (Math.random() * 16) | 0;
      var v = ch === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

import React, { useMemo } from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from "react-native";
import { createDocumentStore } from "@mobile-reality/mdma-runtime";
import { MdmaDocument } from "@mobile-reality/mdma-renderer-react-native";

// Pre-parsed MDMA documents — the components an agent would have generated.
var CHAT = ${JSON.stringify(SNACK_CHAT)};

function UserBubble(props) {
  return (
    <View style={styles.user}>
      <Text style={styles.userText}>{props.text}</Text>
    </View>
  );
}

function BotBubble(props) {
  var store = useMemo(function () {
    return createDocumentStore(props.ast);
  }, []);
  return (
    <View style={styles.bot}>
      <MdmaDocument ast={props.ast} store={store} theme="light" />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {CHAT.map(function (m, i) {
          return m.role === "user" ? (
            <UserBubble key={i} text={m.text} />
          ) : (
            <BotBubble key={i} ast={m.ast} />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

var styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#ffffff" },
  scroll: { padding: 12, gap: 10 },
  user: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    backgroundColor: "#2563eb",
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  userText: { color: "#ffffff", fontSize: 15 },
  bot: {
    alignSelf: "stretch",
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 10,
  },
});
`;

const SNACK_DEPS = [
  '@mobile-reality/mdma-renderer-react-native@0.2.0',
  '@mobile-reality/mdma-runtime@0.3.0',
  '@mobile-reality/mdma-spec@0.3.0',
].join(',');

const SNACK_URL = `https://snack.expo.dev/embedded?${new URLSearchParams({
  code: SNACK_CODE,
  dependencies: SNACK_DEPS,
  // Run in-browser by default (no device transport to wait on); the QR for
  // Expo Go stays available under the "My Device" tab. sdkVersion is omitted so
  // Snack picks a version it actually supports.
  platform: 'web',
  preview: 'true',
  supportedPlatforms: 'web,mydevice,ios,android',
  theme: 'dark',
  name: 'MDMA — React Native renderer',
}).toString()}`;

export function ReactNative() {
  return (
    <>
      <h2>React Native</h2>
      <p>
        <code>@mobile-reality/mdma-renderer-react-native</code> renders MDMA documents as native
        iOS/Android UI — the native sibling of <code>@mobile-reality/mdma-renderer-react</code>. It
        reuses the same headless stack (<code>spec</code> + <code>runtime</code>) unchanged and
        reimplements only the view layer with React Native primitives, so state, bindings, actions,
        policy, audit, and PII redaction all behave exactly as they do on the web.
      </p>

      <h2>Install</h2>
      <Code lang="bash">{`npm install @mobile-reality/mdma-renderer-react-native \\
  @mobile-reality/mdma-spec @mobile-reality/mdma-runtime react react-native`}</Code>

      <h2>Usage</h2>
      <p>
        Parse a document to an AST + store (with <code>@mobile-reality/mdma-parser</code>), then hand
        both to <code>MdmaDocument</code>. Interactions dispatch the same store actions as the web
        renderer.
      </p>
      <Code lang="tsx">{`import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react-native';
import { ScrollView } from 'react-native';

const processor = unified().use(remarkParse).use(remarkMdma, {});

export function Screen({ markdown }: { markdown: string }) {
  const [doc, setDoc] = useState(null);
  useEffect(() => {
    (async () => {
      const ast = await processor.run(processor.parse(markdown), markdown);
      setDoc({ ast, store: createDocumentStore(ast) });
    })();
  }, [markdown]);

  if (!doc) return null;
  return (
    <ScrollView>
      <MdmaDocument ast={doc.ast} store={doc.store} theme="dark" />
    </ScrollView>
  );
}`}</Code>
      <p>
        Theme with <code>theme="light" | "dark"</code> (or a full token object via{' '}
        <code>MdmaThemeProvider</code>), and override any component through the same{' '}
        <code>customizations.components.&lt;type&gt;</code> slot the web renderer uses.
      </p>

      <h2>Try it in Expo Go</h2>
      <p>
        A live, keyless example runs in the panel on the right — a static chat that renders MDMA
        components natively. It defaults to the in-browser preview; switch to the{' '}
        <strong>My Device</strong> tab for the{' '}
        <a href="https://expo.dev/go" target="_blank" rel="noreferrer">Expo Go</a> QR code. There is
        no agent and no API key.
      </p>
      <p className="rn-snack-note">
        The full app (a real MDMA agent with streaming generation) lives at{' '}
        <code>demo-native/</code> in the repo — that one needs your own provider key in a{' '}
        <code>.env</code> file, which is why it isn't embedded here.
      </p>
    </>
  );
}

/** The embedded Expo Snack, rendered in the docs preview panel (right side). */
export function ReactNativeSnack() {
  return (
    <div className="rn-snack-panel">
      <iframe className="rn-snack" src={SNACK_URL} title="MDMA React Native — Expo Snack" />
    </div>
  );
}
