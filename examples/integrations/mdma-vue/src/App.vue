<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-vue';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { parseDocument } from './mdma';
import { SAMPLE_DOCUMENT, DATA_SOURCES } from './document';

// The renderer never touches these directly — `MdmaDocument` reads the store
// and dispatches into it; we only hold them to hand to the component.
const ast = shallowRef<MdmaRoot | null>(null);
const store = shallowRef<DocumentStore | null>(null);

const theme = ref<'light' | 'dark'>('light');

/** Every action/change the store has logged, newest first — the audit trail. */
const log = ref<Array<{ at: string; type: string; component: string }>>([]);

const customizations = computed(() => ({ dataSources: DATA_SOURCES }));

onMounted(async () => {
  const parsed = await parseDocument(SAMPLE_DOCUMENT);
  ast.value = parsed.ast;
  store.value = parsed.store;

  // Mirror the store's own audit log into a panel so actions are visible. The
  // store redacts sensitive values before they land here, exactly as it does
  // for the real log.
  const refresh = () => {
    log.value = parsed.store
      .getEventLog()
      .entries()
      .map((e) => ({
        at: new Date(e.timestamp).toLocaleTimeString(),
        type: e.eventType,
        component: e.componentId,
      }))
      .reverse();
  };
  parsed.store.subscribe(refresh);
  refresh();
});
</script>

<template>
  <div class="page" :class="`page--${theme}`">
    <header class="bar">
      <div>
        <h1>MDMA × Vue</h1>
        <p>One Markdown document, rendered with <code>@mobile-reality/mdma-renderer-vue</code>.</p>
      </div>
      <button class="theme-toggle" type="button" @click="theme = theme === 'light' ? 'dark' : 'light'">
        {{ theme === 'light' ? '🌙 Dark' : '☀️ Light' }}
      </button>
    </header>

    <main class="layout">
      <section class="doc">
        <MdmaDocument
          v-if="ast && store"
          :ast="ast"
          :store="store"
          :customizations="customizations"
          :theme="theme"
        />
        <p v-else class="loading">Parsing document…</p>
      </section>

      <aside class="panel">
        <h2>Audit log</h2>
        <p class="hint">
          Fill the form, reveal the masked Tax ID, approve the gate — every action the store
          records shows here. Sensitive values are redacted before they reach the log.
        </p>
        <ol v-if="log.length" class="events">
          <li v-for="(e, i) in log" :key="i">
            <span class="event-type">{{ e.type }}</span>
            <span class="event-comp">{{ e.component }}</span>
            <span class="event-at">{{ e.at }}</span>
          </li>
        </ol>
        <p v-else class="hint">No events yet.</p>
      </aside>
    </main>
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
.page {
  min-height: 100vh;
  background: #f3f4f6;
  color: #111827;
}
.page--dark {
  background: #0f1420;
  color: #e5e7eb;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(127, 127, 127, 0.2);
}
.bar h1 {
  margin: 0;
  font-size: 1.25rem;
}
.bar p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  opacity: 0.7;
}
.bar code {
  font-size: 0.8em;
}
.theme-toggle {
  padding: 0.5rem 0.9rem;
  border: 1px solid rgba(127, 127, 127, 0.4);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.9rem;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem;
}
@media (max-width: 820px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
.doc {
  background: transparent;
}
.panel {
  align-self: start;
  position: sticky;
  top: 1.5rem;
  padding: 1rem 1.1rem;
  border: 1px solid rgba(127, 127, 127, 0.25);
  border-radius: 12px;
  background: rgba(127, 127, 127, 0.06);
}
.panel h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}
.hint {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  opacity: 0.7;
  line-height: 1.4;
}
.events {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
}
.events li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.15rem 0.5rem;
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
.loading {
  opacity: 0.6;
}
</style>
