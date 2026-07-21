import { Code } from '../Code.js';
import { ReactNativePreview } from './ReactNativePreview.js';
import { RN_RESPONSES } from './rn-responses.js';

// The program shown when the user clicks "Open in Expo Snack" — the same
// interactive chat as the live preview, standalone (imports the published
// packages, includes the Hermes crypto polyfill). RESPONSES are injected as
// JSON via interpolation, so there are no backticks / escaped newlines here.
const SNACK_CODE = `// MDMA — React Native renderer (interactive demo, no API key needed)
if (!global.crypto) global.crypto = {};
if (typeof global.crypto.randomUUID !== "function") {
  global.crypto.randomUUID = function () {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (ch) {
      var r = (Math.random() * 16) | 0;
      var v = ch === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { createDocumentStore } from "@mobile-reality/mdma-runtime";
import { MdmaDocument } from "@mobile-reality/mdma-renderer-react-native";

var RESPONSES = ${JSON.stringify(RN_RESPONSES)};
var CHIPS = ["Contact form", "Release checklist", "Adoption table", "Approval gate"];
var BLUE = "#2563eb";
var BORDER = "#e5e7eb";

function pick(text, n) {
  var t = text.toLowerCase();
  for (var i = 0; i < RESPONSES.length; i++) {
    var kws = RESPONSES[i].match;
    for (var j = 0; j < kws.length; j++) {
      if (t.indexOf(kws[j]) !== -1) return RESPONSES[i];
    }
  }
  return RESPONSES[n % RESPONSES.length];
}

export default function App() {
  var [messages, setMessages] = useState([]);
  var [input, setInput] = useState("");
  var countRef = useRef(0);
  var idRef = useRef(0);
  var scrollRef = useRef(null);

  useEffect(function () {
    if (messages.length && scrollRef.current) scrollRef.current.scrollToEnd({ animated: true });
  }, [messages]);

  function patch(id, next) {
    setMessages(function (prev) {
      return prev.map(function (m) { return m.id === id ? Object.assign({}, m, next) : m; });
    });
  }

  function stream(id, words, i) {
    patch(id, { text: words.slice(0, i).join(" ") });
    if (i < words.length) setTimeout(function () { stream(id, words, i + 1); }, 55);
    else patch(id, { done: true });
  }

  function send(raw) {
    var text = (raw != null ? raw : input).trim();
    if (!text) return;
    setInput("");
    var r = pick(text, countRef.current);
    countRef.current += 1;
    var store = createDocumentStore(r.ast);
    var bid = idRef.current + 2;
    idRef.current += 2;
    setMessages(function (prev) {
      return prev.concat([
        { id: bid - 1, role: "user", text: text },
        { id: bid, role: "assistant", ast: r.ast, store: store, text: "", done: false },
      ]);
    });
    setTimeout(function () { stream(bid, r.reply.split(" "), 1); }, 300);
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarText}>M</Text></View>
          <View>
            <Text style={styles.title}>MDMA Assistant</Text>
            <Text style={styles.subtitle}>React Native renderer</Text>
          </View>
        </View>

        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.scroll}>
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Ask for an interactive component</Text>
              <Text style={styles.emptyHint}>The reply streams in, then renders natively — fully interactive.</Text>
            </View>
          ) : null}
          {messages.map(function (m) {
            if (m.role === "user") {
              return (
                <View key={m.id} style={styles.userRow}>
                  <View style={styles.user}><Text style={styles.userText}>{m.text}</Text></View>
                </View>
              );
            }
            return (
              <View key={m.id} style={styles.bot}>
                {m.text ? (
                  <Text style={styles.botText}>{m.text}{m.done ? "" : " ▌"}</Text>
                ) : (
                  <View style={styles.typing}>
                    <ActivityIndicator size="small" color="#9ca3af" />
                    <Text style={styles.typingText}>Generating…</Text>
                  </View>
                )}
                {m.done ? (
                  <View style={styles.doc}><MdmaDocument ast={m.ast} store={m.store} theme="light" /></View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.chipsWrap}>
          {CHIPS.map(function (c, i) {
            return (
              <Pressable key={i} style={styles.chip} onPress={function () { send(c); }}>
                <Text style={styles.chipText}>{c}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.bar}>
          <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Message…" placeholderTextColor="#9ca3af" onSubmitEditing={function () { send(); }} returnKeyType="send" />
          <Pressable style={[styles.send, !input.trim() && styles.sendDisabled]} onPress={function () { send(); }} disabled={!input.trim()}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

var styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f4f6" },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: BORDER },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  title: { fontSize: 15, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  scroll: { padding: 12, gap: 12 },
  empty: { paddingVertical: 40, paddingHorizontal: 12, gap: 8, alignItems: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#111827", textAlign: "center" },
  emptyHint: { fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 19 },
  userRow: { alignItems: "flex-end" },
  user: { maxWidth: "85%", backgroundColor: BLUE, borderRadius: 18, borderBottomRightRadius: 5, paddingVertical: 9, paddingHorizontal: 13 },
  userText: { color: "#ffffff", fontSize: 15, lineHeight: 20 },
  bot: { alignSelf: "stretch", backgroundColor: "#ffffff", borderRadius: 18, borderBottomLeftRadius: 5, borderWidth: 1, borderColor: BORDER, padding: 12 },
  botText: { color: "#1f2937", fontSize: 15, lineHeight: 22 },
  typing: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { color: "#9ca3af", fontSize: 14 },
  doc: { marginTop: 10 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: BORDER },
  chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: BORDER, backgroundColor: "#f9fafb" },
  chipText: { color: "#374151", fontSize: 13, fontWeight: "500" },
  bar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: BORDER },
  input: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 22, paddingHorizontal: 15, paddingVertical: 10, fontSize: 15, backgroundColor: "#f9fafb" },
  send: { backgroundColor: BLUE, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10 },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: "#ffffff", fontWeight: "600", fontSize: 15 },
});
`;

const SNACK_DEPS = [
  '@mobile-reality/mdma-renderer-react-native@0.2.1',
  '@mobile-reality/mdma-runtime@0.3.1',
  '@mobile-reality/mdma-spec@0.3.1',
].join(',');

// Non-embedded Snack URL — opens the full editor (code + device QR) in a new tab.
const SNACK_OPEN_URL = `https://snack.expo.dev/?${new URLSearchParams({
  code: SNACK_CODE,
  dependencies: SNACK_DEPS,
  platform: 'mydevice',
  supportedPlatforms: 'mydevice,ios,android,web',
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
        Parse a document to an AST + store (with <code>@mobile-reality/mdma-parser</code>), then
        hand both to <code>MdmaDocument</code>. Interactions dispatch the same store actions as the
        web renderer.
      </p>
      <Code lang="tsx">{`import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react-native';
import { ScrollView } from 'react-native';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdma, {});

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

      <h2>Try it</h2>
      <p>
        The panel on the right is the actual <code>renderer-react-native</code> running live (via{' '}
        <code>react-native-web</code>) — send a message or tap a suggestion and the reply streams
        in, then one of four sample MDMA documents renders and stays interactive. No agent, no API
        key. Use <strong>Open in Expo Snack</strong> to see the code and run it on a real device
        with Expo Go.
      </p>
      <p className="rn-snack-note">
        The full app (a real MDMA agent with streaming generation) lives at{' '}
        <code>demo-native/</code> in the repo — that one needs your own provider key in a{' '}
        <code>.env</code> file.
      </p>
    </>
  );
}

/** The live react-native-web preview + a link to the full Snack, rendered in
 *  the docs preview panel (right side). */
export function ReactNativeSnack() {
  return (
    <div className="rn-preview-panel">
      <a className="rn-open-snack" href={SNACK_OPEN_URL} target="_blank" rel="noreferrer">
        Open in Expo Snack ↗
      </a>
      <div className="rn-phone">
        <ReactNativePreview />
      </div>
    </div>
  );
}
