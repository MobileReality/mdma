import { MdmaDocument } from '@mobile-reality/mdma-renderer-react-native';
import { type DocumentStore, createDocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
// Renders live in the browser: `react-native` is aliased to `react-native-web`
// (see vite.config.ts), so this is the exact renderer-react-native code running
// as a web preview — the "emulator" shown in the docs. No code editor, no API
// key; the four responses are pre-parsed and matched by keyword.
import { useEffect, useRef, useState } from 'react';
import { useDemoThemeMode } from '../../theme-context.js';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RN_RESPONSES } from './rn-responses.js';

interface Msg {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  ast?: MdmaRoot;
  store?: DocumentStore;
  done?: boolean;
}

const CHIPS = ['Contact form', 'Release checklist', 'Adoption table', 'Approval gate'];

function pick(text: string, n: number) {
  const t = text.toLowerCase();
  for (const r of RN_RESPONSES) for (const k of r.match) if (t.includes(k)) return r;
  return RN_RESPONSES[n % RN_RESPONSES.length];
}

export function ReactNativePreview() {
  const themeMode = useDemoThemeMode();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const countRef = useRef(0);
  const idRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (messages.length) scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const patch = (id: number, next: Partial<Msg>) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...next } : m)));

  // Reveal the reply one word at a time, then flip `done` so the component renders.
  const stream = (id: number, words: string[], i: number) => {
    patch(id, { text: words.slice(0, i).join(' ') });
    if (i < words.length) setTimeout(() => stream(id, words, i + 1), 55);
    else patch(id, { done: true });
  };

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    setInput('');
    const r = pick(text, countRef.current);
    countRef.current += 1;
    const store = createDocumentStore(r.ast);
    const bid = idRef.current + 2;
    idRef.current += 2;
    setMessages((prev) => [
      ...prev,
      { id: bid - 1, role: 'user', text },
      { id: bid, role: 'assistant', text: '', ast: r.ast, store, done: false },
    ]);
    setTimeout(() => stream(bid, r.reply.split(' '), 1), 300);
  };

  const empty = messages.length === 0;

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>M</Text>
        </View>
        <View>
          <Text style={styles.title}>MDMA Assistant</Text>
          <Text style={styles.subtitle}>React Native renderer</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.scroll}>
        {empty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Ask for an interactive component</Text>
            <Text style={styles.emptyHint}>
              The reply streams in, then renders natively — fully interactive.
            </Text>
          </View>
        ) : null}

        {messages.map((m) =>
          m.role === 'user' ? (
            <View key={m.id} style={styles.userRow}>
              <View style={styles.user}>
                <Text style={styles.userText}>{m.text}</Text>
              </View>
            </View>
          ) : (
            <View key={m.id} style={styles.bot}>
              {m.text ? (
                <Text style={styles.botText}>
                  {m.text}
                  {m.done ? '' : ' ▌'}
                </Text>
              ) : (
                <View style={styles.typing}>
                  <ActivityIndicator size="small" color="#9ca3af" />
                  <Text style={styles.typingText}>Generating…</Text>
                </View>
              )}
              {m.done && m.ast && m.store ? (
                <View style={styles.doc}>
                  <MdmaDocument ast={m.ast} store={m.store} theme={themeMode} />
                </View>
              ) : null}
            </View>
          ),
        )}
      </ScrollView>

      <View style={styles.chipsWrap}>
        {CHIPS.map((c) => (
          <Pressable key={c} style={styles.chip} onPress={() => send(c)}>
            <Text style={styles.chipText}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.bar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message…"
          placeholderTextColor="#9ca3af"
          onSubmitEditing={() => send()}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.send, !input.trim() && styles.sendDisabled]}
          onPress={() => send()}
          disabled={!input.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const BLUE = '#2563eb';
const BORDER = '#e5e7eb';

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f3f4f6' },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 1 },

  scroll: { padding: 12, gap: 12 },
  empty: { paddingVertical: 40, paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptyHint: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 },

  userRow: { alignItems: 'flex-end' },
  user: {
    maxWidth: '85%',
    backgroundColor: BLUE,
    borderRadius: 18,
    borderBottomRightRadius: 5,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  userText: { color: '#ffffff', fontSize: 15, lineHeight: 20 },

  bot: {
    alignSelf: 'stretch',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  botText: { color: '#1f2937', fontSize: 15, lineHeight: 22 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { color: '#9ca3af', fontSize: 14 },
  doc: { marginTop: 10 },

  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#f9fafb',
  },
  chipText: { color: '#374151', fontSize: 13, fontWeight: '500' },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#f9fafb',
  },
  send: {
    backgroundColor: BLUE,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
});
