<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import ChatMessage from './components/ChatMessage.vue';
import { useChat } from './useChat';
import { SUGGESTIONS } from './agent';
import { API_KEY, MODEL } from './openrouter';

const { turns, isStreaming, error, events, send, stop, clear } = useChat();

const input = ref('');
const theme = ref<'light' | 'dark'>('light');
const scroller = ref<HTMLElement | null>(null);

async function submit(text?: string) {
  const value = text ?? input.value;
  if (!value.trim() || isStreaming.value) return;
  input.value = '';
  await send(value);
}

// Keep the newest turn in view as the conversation grows and streams. The
// thread is its own scroll container, so this never moves the window.
watch(
  () => turns.value.map((t) => t.content).join('|'),
  async () => {
    await nextTick();
    scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' });
  },
);
</script>

<template>
  <div class="app" :class="`app--${theme}`">
    <header class="bar">
      <div>
        <h1>MDMA × Vue — agent chat</h1>
        <p>
          Streamed from <code>{{ MODEL }}</code> via OpenRouter · components drawn by
          <code>@mobile-reality/mdma-renderer-vue</code>
        </p>
      </div>
      <div class="bar-actions">
        <button type="button" class="ghost" @click="theme = theme === 'light' ? 'dark' : 'light'">
          {{ theme === 'light' ? '🌙' : '☀️' }}
        </button>
        <button type="button" class="ghost" :disabled="!turns.length || isStreaming" @click="clear">
          Clear
        </button>
      </div>
    </header>

    <p v-if="!API_KEY" class="notice">
      Set <code>VITE_OPENROUTER_API_KEY</code> in a <code>.env</code> file (see
      <code>.env.example</code>) and restart the dev server.
    </p>

    <div class="body">
      <main ref="scroller" class="thread">
        <div class="thread-inner">
          <div v-if="!turns.length" class="empty">
            <p>Ask for something that could use a UI — a form, a table, an approval step:</p>
            <div class="suggestions">
              <button
                v-for="s in SUGGESTIONS"
                :key="s"
                type="button"
                class="chip"
                :disabled="!API_KEY"
                @click="submit(s)"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <ChatMessage v-for="turn in turns" :key="turn.id" :turn="turn" :theme="theme" />

          <p v-if="error" class="notice error">{{ error }}</p>
        </div>
      </main>

      <aside class="log">
        <h2>Action log</h2>
        <p class="hint">
          Every action the components dispatch into their store — field edits, submits, approvals.
          Sensitive values are redacted before they land here.
        </p>
        <ol v-if="events.length" class="events">
          <li v-for="(e, i) in events" :key="i">
            <span class="event-type">{{ e.type }}</span>
            <span class="event-comp">{{ e.component }}</span>
            <span class="event-at">{{ e.at }}</span>
          </li>
        </ol>
        <p v-else class="hint muted">No actions yet.</p>
      </aside>
    </div>

    <footer class="composer">
      <textarea
        v-model="input"
        rows="1"
        placeholder="Message the agent…"
        :disabled="!API_KEY"
        @keydown.enter.exact.prevent="submit()"
      />
      <button v-if="isStreaming" type="button" class="send stop" @click="stop">Stop</button>
      <button
        v-else
        type="button"
        class="send"
        :disabled="!input.trim() || !API_KEY"
        @click="submit()"
      >
        Send
      </button>
    </footer>
  </div>
</template>

<style>
:root {
  color-scheme: light dark;
}
html,
body {
  margin: 0;
  height: 100%;
}
body {
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f3f4f6;
  color: #111827;
}
.app--dark {
  background: #0f1420;
  color: #e5e7eb;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid rgba(127, 127, 127, 0.2);
}
.bar h1 {
  margin: 0;
  font-size: 1.05rem;
}
.bar p {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  opacity: 0.65;
}
.bar code {
  font-size: 0.85em;
}
.bar-actions {
  display: flex;
  gap: 0.4rem;
}
.ghost {
  padding: 0.4rem 0.7rem;
  border: 1px solid rgba(127, 127, 127, 0.35);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.85rem;
}
.ghost:disabled {
  opacity: 0.4;
  cursor: default;
}

/* The body is the flex row that fills the space between header and composer.
   `min-height: 0` is the crucial bit: without it a flex child refuses to
   shrink below its content, so the thread can't scroll and the window does. */
.body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.thread {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 1.25rem;
}
.thread-inner {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.log {
  flex: 0 0 300px;
  overflow-y: auto;
  padding: 1rem 1.1rem;
  border-left: 1px solid rgba(127, 127, 127, 0.2);
  background: rgba(127, 127, 127, 0.04);
}
.log h2 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}
@media (max-width: 820px) {
  .log {
    display: none;
  }
}
.empty {
  margin: auto 0;
  text-align: center;
  opacity: 0.85;
}
.suggestions {
  margin-top: 0.9rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}
.chip {
  padding: 0.5rem 0.85rem;
  border: 1px solid rgba(108, 92, 231, 0.4);
  border-radius: 999px;
  background: rgba(108, 92, 231, 0.08);
  color: inherit;
  cursor: pointer;
  font-size: 0.85rem;
}
.chip:disabled {
  opacity: 0.4;
  cursor: default;
}
.hint {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  opacity: 0.7;
  line-height: 1.45;
}
.hint.muted {
  opacity: 0.5;
}
.events {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.78rem;
}
.events li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.1rem 0.5rem;
  padding: 0.4rem 0.5rem;
  border-radius: 8px;
  background: rgba(127, 127, 127, 0.1);
}
.event-type {
  font-weight: 600;
}
.event-comp {
  opacity: 0.65;
}
.event-at {
  grid-column: 2;
  grid-row: 1 / 3;
  align-self: center;
  opacity: 0.5;
  font-variant-numeric: tabular-nums;
}
.notice {
  max-width: 720px;
  margin: 0.75rem auto 0;
  padding: 0.7rem 1rem;
  font-size: 0.85rem;
  border-radius: 10px;
  background: rgba(243, 156, 18, 0.15);
  border: 1px solid rgba(243, 156, 18, 0.4);
}
.notice.error {
  background: rgba(231, 76, 60, 0.15);
  border-color: rgba(231, 76, 60, 0.45);
}
.composer {
  display: flex;
  gap: 0.6rem;
  align-items: flex-end;
  padding: 0.9rem 1.25rem;
  border-top: 1px solid rgba(127, 127, 127, 0.2);
}
.composer textarea {
  flex: 1;
  resize: none;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(127, 127, 127, 0.35);
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 1.4;
  max-height: 160px;
}
.send {
  padding: 0.7rem 1.2rem;
  border: none;
  border-radius: 12px;
  background: #6c5ce7;
  color: #fff;
  cursor: pointer;
  font-weight: 600;
}
.send:disabled {
  opacity: 0.4;
  cursor: default;
}
.send.stop {
  background: #e74c3c;
}
</style>
