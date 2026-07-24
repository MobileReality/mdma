<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import ChatMessage from './components/ChatMessage.vue';
import { useChat } from './useChat';
import { SUGGESTIONS } from './agent';
import { API_KEY, MODEL } from './openrouter';

const { turns, isStreaming, error, send, stop, clear } = useChat();

const input = ref('');
const theme = ref<'light' | 'dark'>('light');
const scroller = ref<HTMLElement | null>(null);

async function submit(text?: string) {
  const value = text ?? input.value;
  if (!value.trim() || isStreaming.value) return;
  input.value = '';
  await send(value);
}

// Keep the newest turn in view as the conversation grows and streams.
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

    <main ref="scroller" class="thread">
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
    </main>

    <footer class="composer">
      <textarea
        v-model="input"
        rows="1"
        placeholder="Message the agent…"
        :disabled="!API_KEY"
        @keydown.enter.exact.prevent="submit()"
      />
      <button v-if="isStreaming" type="button" class="send stop" @click="stop">Stop</button>
      <button v-else type="button" class="send" :disabled="!input.trim() || !API_KEY" @click="submit()">
        Send
      </button>
    </footer>
  </div>
</template>

<style>
:root {
  color-scheme: light dark;
}
body {
  margin: 0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
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
.thread {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
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
.notice {
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
  padding: 0.7rem 1rem;
  font-size: 0.85rem;
  border-radius: 10px;
  background: rgba(243, 156, 18, 0.15);
  border: 1px solid rgba(243, 156, 18, 0.4);
  box-sizing: border-box;
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
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
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
