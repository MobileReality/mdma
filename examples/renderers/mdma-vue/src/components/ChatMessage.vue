<script setup lang="ts">
import { MdmaDocument, type MdmaRenderCustomizations } from '@mobile-reality/mdma-renderer-vue';
import type { Turn } from '../useChat';

const props = defineProps<{
  turn: Turn;
  theme: 'light' | 'dark';
  customizations?: MdmaRenderCustomizations;
}>();
</script>

<template>
  <div class="msg" :class="`msg--${props.turn.role}`">
    <div class="avatar">{{ props.turn.role === 'user' ? 'You' : 'AI' }}</div>
    <div class="bubble">
      <!-- Assistant turns render as a full MDMA document: Markdown prose plus
           any embedded mdma components, drawn by the Vue renderer. Before the
           first parse (or for user turns) we show the raw text. -->
      <MdmaDocument
        v-if="props.turn.role === 'assistant' && props.turn.ast && props.turn.store"
        :ast="props.turn.ast"
        :store="props.turn.store"
        :theme="props.theme"
        :customizations="props.customizations"
      />
      <p v-else class="plain">{{ props.turn.content || '…' }}</p>
    </div>
  </div>
</template>

<style scoped>
.msg {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}
.msg--user {
  flex-direction: row-reverse;
}
.avatar {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(108, 92, 231, 0.15);
  color: #6c5ce7;
}
.msg--user .avatar {
  background: rgba(127, 127, 127, 0.18);
  color: inherit;
}
.bubble {
  min-width: 0;
  padding: 0.4rem 0.9rem;
  border-radius: 14px;
  background: rgba(127, 127, 127, 0.08);
  border: 1px solid rgba(127, 127, 127, 0.14);
}
/* Assistant turns hold rendered components (forms, tables), so give them room —
   nearly the full column. User turns are short text, so keep them compact. */
.msg--assistant .bubble {
  flex: 1;
  max-width: 100%;
}
.msg--user .bubble {
  max-width: 80%;
  background: #6c5ce7;
  color: #fff;
  padding: 0.6rem 0.9rem;
}
.plain {
  margin: 0.4rem 0;
  white-space: pre-wrap;
  line-height: 1.5;
}
/* The renderer's own .mdma-document already has margins; tighten inside a bubble. */
.bubble :deep(.mdma-document) {
  margin: 0;
}
</style>
