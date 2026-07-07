import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { ModelMessage } from 'ai';
import { parseMdma } from '@mobile-reality/mdma-agui';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react-native';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import {
  PROVIDERS,
  keyFor,
  runAgent,
  DEFAULT_PROVIDER,
  defaultModelFor,
  type ProviderId,
} from './llm';

type Theme = 'light' | 'dark';

/** An assistant turn is a list of blocks, mirroring the web Agent Chat. */
interface Block {
  id: string;
  kind: 'text' | 'tool';
  text?: string;
  doc?: { ast: MdmaRoot; store: DocumentStore };
  generating?: boolean;
}

type ChatMessage =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; blocks: Block[] };

const SUGGESTIONS = [
  'Make me a contact form',
  'A release checklist with tasks, a table, and an approval gate',
];

/**
 * Patch a tool block by id, creating it if it doesn't exist. `onToolStart`
 * normally creates the placeholder on the AI SDK's `tool-input-start` event, but
 * not every provider/model emits that — so document/error updates must upsert,
 * or a successfully generated document would be silently dropped.
 */
function upsertTool(blocks: Block[], toolId: string, next: Partial<Block>): Block[] {
  const id = `tool-${toolId}`;
  if (blocks.some((b) => b.id === id)) {
    return blocks.map((b) => (b.id === id ? { ...b, ...next } : b));
  }
  return [...blocks, { id, kind: 'tool', generating: false, ...next }];
}

export function App() {
  const system = useColorScheme();
  const [theme, setTheme] = useState<Theme>(system === 'dark' ? 'dark' : 'light');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [provider, setProvider] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [model, setModel] = useState(defaultModelFor(DEFAULT_PROVIDER));

  const idRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const historyRef = useRef<ModelMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const dark = theme === 'dark';
  const c = useMemo(() => palette(dark), [dark]);
  const apiKey = keyFor(provider);
  const live = Boolean(apiKey);

  useEffect(() => {
    if (messages.length) scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Mutate the blocks of a specific assistant message.
  const editBlocks = useCallback((botId: number, fn: (blocks: Block[]) => Block[]) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === botId && m.role === 'assistant' ? { ...m, blocks: fn(m.blocks) } : m)),
    );
  }, []);

  const pickProvider = useCallback((id: ProviderId) => {
    setProvider(id);
    setModel(defaultModelFor(id));
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      setInput('');

      const userId = ++idRef.current;
      const botId = ++idRef.current;

      if (!apiKey) {
        const envVar = PROVIDERS.find((p) => p.id === provider)?.envVar;
        setMessages((prev) => [
          ...prev,
          { id: userId, role: 'user', text },
          {
            id: botId,
            role: 'assistant',
            blocks: [
              {
                id: `${botId}-nokey`,
                kind: 'text',
                text: `⚠️ No API key for ${provider}. Set ${envVar} in demo-native/.env and rebuild.`,
              },
            ],
          },
        ]);
        return;
      }

      setBusy(true);
      setMessages((prev) => [
        ...prev,
        { id: userId, role: 'user', text },
        { id: botId, role: 'assistant', blocks: [] },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      const nextBlockId = () => `${botId}-${++idRef.current}`;

      try {
        const turnMessages: ModelMessage[] = [
          ...historyRef.current,
          { role: 'user', content: text },
        ];

        const generated = await runAgent({
          provider,
          apiKey,
          model,
          messages: turnMessages,
          signal: controller.signal,
          callbacks: {
            onTextDelta: (delta) =>
              editBlocks(botId, (blocks) => {
                const last = blocks[blocks.length - 1];
                if (last && last.kind === 'text') {
                  return blocks.map((b, i) =>
                    i === blocks.length - 1 ? { ...b, text: (b.text ?? '') + delta } : b,
                  );
                }
                return [...blocks, { id: nextBlockId(), kind: 'text', text: delta }];
              }),
            onToolStart: (toolId) =>
              editBlocks(botId, (blocks) => [
                ...blocks,
                { id: `tool-${toolId}`, kind: 'tool', generating: true },
              ]),
            onToolDocument: (toolId, document) => {
              parseMdma(document)
                .then(({ ast, store }) =>
                  editBlocks(botId, (blocks) =>
                    upsertTool(blocks, toolId, { doc: { ast, store }, generating: false }),
                  ),
                )
                .catch((e: unknown) =>
                  editBlocks(botId, (blocks) =>
                    upsertTool(blocks, toolId, { generating: false, text: `⚠️ ${String(e)}` }),
                  ),
                );
            },
            onToolError: (toolId, message) =>
              editBlocks(botId, (blocks) =>
                upsertTool(blocks, toolId, { generating: false, text: `⚠️ ${message}` }),
              ),
          },
        });

        historyRef.current = [...turnMessages, ...generated];
      } catch (e) {
        if (controller.signal.aborted) {
          // user stopped — leave partial output as-is
        } else {
          const message = e instanceof Error ? e.message : String(e);
          editBlocks(botId, (blocks) => [...blocks, { id: nextBlockId(), kind: 'text', text: `⚠️ ${message}` }]);
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, apiKey, provider, model, editBlocks],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    historyRef.current = [];
    setBusy(false);
  }, []);

  const providerLabel = PROVIDERS.find((p) => p.id === provider)?.label ?? provider;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.pageBg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.chromeBg, borderBottomColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>MDMA Agent</Text>
          <Text style={[styles.subtitle, { color: live ? c.accent : '#dc2626' }]} numberOfLines={1}>
            {live ? `${providerLabel} · ${model}` : `No key · set ${PROVIDERS.find((p) => p.id === provider)?.envVar}`}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setShowSettings((v) => !v)} style={[styles.iconBtn, { borderColor: c.border }]}>
            <Text style={{ color: c.text, fontSize: 13 }}>⚙️</Text>
          </Pressable>
          <Pressable onPress={() => setTheme(dark ? 'light' : 'dark')} style={[styles.iconBtn, { borderColor: c.border }]}>
            <Text style={{ color: c.text, fontSize: 13 }}>{dark ? '☀️' : '🌙'}</Text>
          </Pressable>
          <Pressable onPress={reset} style={[styles.iconBtn, { borderColor: c.border }]}>
            <Text style={{ color: c.text, fontSize: 13 }}>Clear</Text>
          </Pressable>
        </View>
      </View>

      {/* Settings — provider + model. Keys come from .env (EXPO_PUBLIC_*). */}
      {showSettings ? (
        <View style={[styles.settings, { backgroundColor: c.chromeBg, borderBottomColor: c.border }]}>
          <Text style={[styles.settingsLabel, { color: c.muted }]}>Provider</Text>
          <View style={styles.row}>
            {PROVIDERS.map((p) => {
              const active = p.id === provider;
              const hasKey = Boolean(keyFor(p.id));
              return (
                <Pressable
                  key={p.id}
                  onPress={() => pickProvider(p.id)}
                  style={[styles.chip, { borderColor: active ? c.accent : c.border }, active && { backgroundColor: c.accent }]}
                >
                  <Text style={{ color: active ? '#fff' : c.text, fontSize: 13 }}>
                    {hasKey ? '● ' : '○ '}
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.settingsLabel, { color: c.muted }]}>Model</Text>
          <TextInput
            value={model}
            onChangeText={setModel}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.settingsInput, { color: c.text, borderColor: c.border, backgroundColor: c.pageBg }]}
          />
          <Text style={[styles.settingsHint, { color: c.muted }]}>
            ● = key present. Set keys in demo-native/.env (EXPO_PUBLIC_…_API_KEY) and rebuild — they are
            never entered in the app.
          </Text>
        </View>
      ) : null}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, paddingBottom: 20, gap: 10 }}
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: c.text }]}>Chat with the MDMA agent</Text>
            <Text style={[styles.emptyHint, { color: c.muted }]}>
              Ask for an interactive document. The agent replies conversationally and calls its
              generate_mdma tool to render native UI inline.
            </Text>
          </View>
        ) : null}

        {messages.map((m) =>
          m.role === 'user' ? (
            <View key={m.id} style={[styles.userBubble, { backgroundColor: c.accent }]}>
              <Text style={{ color: '#fff', fontSize: 15 }}>{m.text}</Text>
            </View>
          ) : (
            <View key={m.id} style={[styles.botBubble, { backgroundColor: c.botBg, borderColor: c.border }]}>
              {m.blocks.length === 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={c.muted} />
                  <Text style={{ color: c.muted, fontSize: 14 }}>Thinking…</Text>
                </View>
              ) : null}
              {m.blocks.map((b) =>
                b.kind === 'text' ? (
                  <Text key={b.id} style={{ color: c.text, fontSize: 15, lineHeight: 22 }}>
                    {b.text}
                  </Text>
                ) : b.doc ? (
                  <MdmaDocument key={b.id} ast={b.doc.ast} store={b.doc.store} theme={theme} style={{ gap: 8 }} />
                ) : (
                  <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                    <ActivityIndicator size="small" color={c.muted} />
                    <Text style={{ color: c.muted, fontSize: 13 }}>
                      {b.text ?? 'Generating document…'}
                    </Text>
                  </View>
                ),
              )}
            </View>
          ),
        )}
      </ScrollView>

      {/* Suggestions */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, backgroundColor: c.chromeBg }}
        contentContainerStyle={{ padding: 8, gap: 8 }}
      >
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s}
            disabled={busy}
            onPress={() => send(s)}
            style={[styles.chip, { borderColor: c.border, opacity: busy ? 0.5 : 1 }]}
          >
            <Text style={{ color: c.text, fontSize: 13 }}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputBar, { backgroundColor: c.chromeBg, borderTopColor: c.border }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Message the agent…"
          placeholderTextColor={c.muted}
          editable={!busy}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          style={[styles.textInput, { color: c.text, borderColor: c.border, backgroundColor: c.pageBg }]}
        />
        {busy ? (
          <Pressable onPress={stop} style={[styles.sendBtn, { backgroundColor: '#dc2626' }]}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Stop</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim()}
            style={[styles.sendBtn, { backgroundColor: c.accent, opacity: input.trim() ? 1 : 0.5 }]}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Send</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function palette(dark: boolean) {
  return dark
    ? {
        pageBg: '#0b0f19',
        chromeBg: '#151a26',
        botBg: '#141a26',
        border: '#2a3140',
        text: '#f3f4f6',
        muted: '#9ca3af',
        accent: '#3b82f6',
      }
    : {
        pageBg: '#ffffff',
        chromeBg: '#f7f7f8',
        botBg: '#ffffff',
        border: '#e5e7eb',
        text: '#1a1a1a',
        muted: '#6b7280',
        accent: '#2563eb',
      };
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  settings: { padding: 12, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  settingsLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  settingsInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  settingsHint: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  empty: { paddingVertical: 48, paddingHorizontal: 12, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyHint: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
});
