import {
  MdmaDocument,
  lightTheme,
  darkTheme,
  type MdmaTheme,
} from '@mobile-reality/mdma-renderer-react-native';
import { type DocumentStore, createDocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
// Renders live in the browser: `react-native` is aliased to `react-native-web`
// (see vite.config.ts), so this is the exact renderer-react-native code running
// as a web preview — the "emulator" shown in the docs. No code editor, no API
// key; the four responses are pre-parsed and matched by keyword.
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const t = themeMode === 'dark' ? darkTheme : lightTheme;
  const styles = useMemo(() => makeStyles(t), [t]);
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
                  <ActivityIndicator size="small" color={t.colors.textMuted} />
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
          placeholderTextColor={t.colors.textMuted}
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

/**
 * Build the phone-mock chrome styles from the MDMA theme so the preview shell
 * (bubbles, bars, chips) tracks the same light/dark palette as the rendered
 * MDMA content inside it. `screen` is the area behind the bubbles — a touch
 * darker/lighter than the card surfaces.
 */
function makeStyles(t: MdmaTheme) {
  const { colors: c } = t;
  const screen = themeIsDark(c) ? '#0e1119' : '#f3f4f6';
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: screen },
    flex: { flex: 1 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: c.background,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: c.onPrimary, fontWeight: '700', fontSize: 16 },
    title: { fontSize: 15, fontWeight: '700', color: c.text },
    subtitle: { fontSize: 12, color: c.textMuted, marginTop: 1 },

    scroll: { padding: 12, gap: 12 },
    empty: { paddingVertical: 40, paddingHorizontal: 12, gap: 8, alignItems: 'center' },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: c.text, textAlign: 'center' },
    emptyHint: { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 19 },

    userRow: { alignItems: 'flex-end' },
    user: {
      maxWidth: '85%',
      backgroundColor: c.primary,
      borderRadius: 18,
      borderBottomRightRadius: 5,
      paddingVertical: 9,
      paddingHorizontal: 13,
    },
    userText: { color: c.onPrimary, fontSize: 15, lineHeight: 20 },

    bot: {
      alignSelf: 'stretch',
      backgroundColor: c.background,
      borderRadius: 18,
      borderBottomLeftRadius: 5,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
    },
    botText: { color: c.text, fontSize: 15, lineHeight: 22 },
    typing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    typingText: { color: c.textMuted, fontSize: 14 },
    doc: { marginTop: 10 },

    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: c.background,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    chip: {
      paddingVertical: 7,
      paddingHorizontal: 13,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipText: { color: c.text, fontSize: 13, fontWeight: '500' },

    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: c.background,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 22,
      paddingHorizontal: 15,
      paddingVertical: 10,
      fontSize: 15,
      color: c.text,
      backgroundColor: c.surface,
    },
    send: {
      backgroundColor: c.primary,
      borderRadius: 22,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    sendDisabled: { opacity: 0.45 },
    sendText: { color: c.onPrimary, fontWeight: '600', fontSize: 15 },
  });
}

/** The dark palette's background is a dark navy; the light one is white. */
function themeIsDark(colors: MdmaTheme['colors']): boolean {
  return colors.background.toLowerCase() !== '#ffffff';
}
