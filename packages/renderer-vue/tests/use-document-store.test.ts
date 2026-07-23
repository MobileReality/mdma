import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import type { ComponentState, DocumentStore } from '@mobile-reality/mdma-runtime';
import { MdmaProvider } from '../src/context/MdmaProvider.js';
import {
  useBinding,
  useComponentState,
  useDocumentState,
  useDocumentStore,
} from '../src/composables/use-document-store.js';
import { mdma, parseDoc } from './helpers/doc.js';

const DOC = [
  mdma(`
type: form
id: profile
fields:
  - name: email
    type: email
    label: "Email"
onSubmit: save-profile
`),
  mdma(`
type: form
id: other
fields:
  - name: note
    type: text
    label: "Note"
onSubmit: save-other
`),
].join('\n');

/** Mounts `use` inside a provider and reports what it observed on each render. */
function mountProbe<T>(store: DocumentStore, use: () => { value: T }) {
  const seen: T[] = [];
  const Probe = defineComponent({
    setup() {
      const observed = use();
      return () => {
        seen.push(observed.value);
        return h('i');
      };
    },
  });
  const wrapper = mount(MdmaProvider, { props: { store }, slots: { default: () => h(Probe) } });
  return { wrapper, seen };
}

const change = (store: DocumentStore, componentId: string, field: string, value: unknown) =>
  store.dispatch({ type: 'FIELD_CHANGED', componentId, field, value });

describe('useDocumentStore', () => {
  it('exposes the provided store', async () => {
    const { store } = await parseDoc(DOC);
    const { seen } = mountProbe(store, () => useDocumentStore());
    expect(seen[0]).toBe(store);
  });
});

describe('useComponentState', () => {
  it('reflects a change to its own component', async () => {
    const { store } = await parseDoc(DOC);
    const { wrapper, seen } = mountProbe(store, () => useComponentState('profile'));

    change(store, 'profile', 'email', 'a@b.c');
    await wrapper.vm.$nextTick();

    const last = seen.at(-1) as ComponentState;
    expect(last.values.email).toBe('a@b.c');
  });

  it('keeps snapshot identity when a different component changes', async () => {
    const { store } = await parseDoc(DOC);
    const { wrapper, seen } = mountProbe(store, () => useComponentState('profile'));
    const first = seen[0];

    change(store, 'other', 'note', 'unrelated');
    await wrapper.vm.$nextTick();

    // Every snapshot handed out for `profile` is still the same object, so a
    // renderer bound to it has nothing to re-render.
    expect(seen.every((s) => s === first)).toBe(true);
  });

  it('is undefined for an unknown component id', async () => {
    const { store } = await parseDoc(DOC);
    const { seen } = mountProbe(store, () => useComponentState('nope'));
    expect(seen[0]).toBeUndefined();
  });
});

describe('useBinding', () => {
  it('resolves an expression and tracks later changes', async () => {
    const { store } = await parseDoc(DOC);
    const { wrapper, seen } = mountProbe(store, () => useBinding<string>('{{profile.email}}'));

    change(store, 'profile', 'email', 'x@y.z');
    await wrapper.vm.$nextTick();

    expect(seen.at(-1)).toBe('x@y.z');
  });
});

describe('useDocumentState', () => {
  it('hands out a fresh snapshot per store notification', async () => {
    const { store } = await parseDoc(DOC);
    const { wrapper, seen } = mountProbe(store, () => useDocumentState());

    change(store, 'profile', 'email', 'a@b.c');
    await wrapper.vm.$nextTick();

    expect(seen.length).toBeGreaterThan(1);
    expect(seen.at(-1)).not.toBe(seen[0]);
    expect(seen.at(-1)?.components.get('profile')?.values.email).toBe('a@b.c');
  });

  it('unsubscribes from the store when the component unmounts', async () => {
    const { store } = await parseDoc(DOC);
    const { wrapper, seen } = mountProbe(store, () => useDocumentState());
    const before = seen.length;

    wrapper.unmount();
    change(store, 'profile', 'email', 'after-unmount');
    await new Promise((r) => setTimeout(r, 0));

    expect(seen.length).toBe(before);
  });
});
