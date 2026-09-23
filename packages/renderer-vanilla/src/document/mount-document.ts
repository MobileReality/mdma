import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { MDMA_LANG_TAG, type MdmaBlock, type MdmaRoot } from '@mobile-reality/mdma-spec';
import { renderBlockLoading } from '../components/MdmaBlockLoading.js';
import type {
  CustomVariants,
  DataSources,
  ElementOverrides,
  ElementRenderer,
  RenderContext,
} from '../context/render-context.js';
import { el } from '../dom/el.js';
import { type MdastNode, renderMdast } from '../markdown/render-mdast.js';
import type { MdmaBlockRenderer, RendererInstance } from '../renderers/renderer-props.js';
import { type MdmaThemeInput, applyTheme, resolveThemeProps } from '../theme/theme.js';
import { blockRendererProps, mountMdmaBlock } from './mount-block.js';
import {
  buildPartialThinkingBlock,
  extractIdFromYaml,
  extractTypeFromYaml,
} from './partial-yaml.js';

/**
 * A component entry is either a renderer, or a config object carrying a renderer
 * and/or sub-element overrides (form inputs, the submit button, …).
 */
export type ComponentEntry =
  | MdmaBlockRenderer
  | { renderer?: MdmaBlockRenderer; elements?: Record<string, ElementRenderer<never>> };

export interface MdmaRenderCustomizations {
  components?: Record<string, ComponentEntry>;
  customVariants?: CustomVariants;
  dataSources?: DataSources;
}

export interface MdmaDocumentOptions {
  ast: MdmaRoot;
  store: DocumentStore;
  customizations?: MdmaRenderCustomizations;
  theme?: MdmaThemeInput;
  className?: string;
}

export interface MdmaDocumentHandle {
  el: HTMLElement;
  /** Apply a new AST, store, customizations, or theme. Omitted fields are kept. */
  update(next: Partial<MdmaDocumentOptions>): void;
  destroy(): void;
}

type SlotKind = 'block' | 'loading' | 'markdown';

interface Slot {
  kind: SlotKind;
  el: HTMLElement;
  instance?: RendererInstance;
}

interface Desired {
  key: string;
  kind: SlotKind;
  block?: MdmaBlock;
  pending?: { value?: string };
  markdown?: MdastNode;
}

function isMdmaBlock(node: unknown): node is MdmaBlock {
  return (node as { type?: string })?.type === 'mdmaBlock';
}

/** A `lang="mdma"` code node that never became a block — still streaming, or invalid. */
function isPendingMdmaBlock(node: unknown): boolean {
  const candidate = node as { type?: string; lang?: string };
  return candidate?.type === 'code' && candidate?.lang === MDMA_LANG_TAG;
}

function splitComponents(components?: Record<string, ComponentEntry>) {
  const renderers: Record<string, MdmaBlockRenderer> = {};
  const elementOverrides: ElementOverrides = {};

  for (const [type, entry] of Object.entries(components ?? {})) {
    if (typeof entry === 'function') {
      renderers[type] = entry;
      continue;
    }
    if (entry.renderer) renderers[type] = entry.renderer;
    if (entry.elements) elementOverrides[type] = entry.elements;
  }

  return { renderers, elementOverrides };
}

export function mountMdmaDocument(
  container: HTMLElement,
  options: MdmaDocumentOptions,
): MdmaDocumentHandle {
  let current = options;
  const root = el('div');
  const slots = new Map<string, Slot>();

  // Once a block has parsed, keep it: while streaming, a completed fence can
  // briefly revert to a pending code node as later text arrives, and falling
  // back to the loading skeleton would make the document flicker.
  const lastGood = new Map<string, MdmaBlock>();

  let renderers: Record<string, MdmaBlockRenderer> = {};
  let context: RenderContext = {};

  function applyOptions() {
    const split = splitComponents(current.customizations?.components);
    renderers = split.renderers;
    context = {
      dataSources: current.customizations?.dataSources,
      customVariants: current.customizations?.customVariants,
      elementOverrides: Object.keys(split.elementOverrides).length
        ? split.elementOverrides
        : undefined,
    };

    root.className = `mdma-document ${current.className ?? ''}`.trim();
    applyTheme(root, resolveThemeProps(current.theme));
  }

  // Keyed by type as well as id: mid-stream a truncated type (`approval-gat`)
  // completes into a different one, and that block must be re-mounted with the
  // renderer the new type resolves to, not updated in the old one.
  const blockKey = (block: MdmaBlock) => `block:${block.component.id}:${block.component.type}`;

  function planChild(child: unknown, index: number): Desired {
    if (isMdmaBlock(child)) {
      lastGood.set(child.component.id, child);
      return { key: blockKey(child), kind: 'block', block: child };
    }

    if (isPendingMdmaBlock(child)) {
      const yaml = (child as { value?: string }).value;
      const id = extractIdFromYaml(yaml);

      const cached = id ? lastGood.get(id) : undefined;
      if (cached) return { key: blockKey(cached), kind: 'block', block: cached };

      // A thinking block streams its content live rather than showing a skeleton.
      if (extractTypeFromYaml(yaml) === 'thinking' && yaml) {
        const partial = buildPartialThinkingBlock(yaml);
        if (partial) return { key: blockKey(partial), kind: 'block', block: partial };
      }

      return { key: `loading:${index}`, kind: 'loading', pending: child as { value?: string } };
    }

    return { key: `markdown:${index}`, kind: 'markdown', markdown: child as MdastNode };
  }

  function createSlot(desired: Desired): Slot {
    if (desired.kind === 'block' && desired.block) {
      const instance = mountMdmaBlock({
        block: desired.block,
        store: current.store,
        renderers,
        context,
      });
      return { kind: 'block', el: instance.el, instance };
    }
    if (desired.kind === 'loading') {
      return { kind: 'loading', el: renderBlockLoading(desired.pending ?? {}) };
    }
    return { kind: 'markdown', el: renderMdast(desired.markdown ?? { type: 'text' }) };
  }

  function updateSlot(slot: Slot, desired: Desired): Slot {
    if (desired.kind === 'block' && desired.block && slot.instance) {
      slot.instance.update(
        blockRendererProps({
          block: desired.block,
          store: current.store,
          renderers,
          context,
        }),
      );
      slot.el = slot.instance.el;
      return slot;
    }

    // Markdown and skeletons hold no state worth preserving — rebuild them.
    const rebuilt = createSlot(desired);
    slot.el.replaceWith(rebuilt.el);
    return rebuilt;
  }

  function render() {
    const desired = current.ast.children.map((child, index) => planChild(child, index));
    const seen = new Set<string>();

    for (const entry of desired) {
      seen.add(entry.key);
      const existing = slots.get(entry.key);
      slots.set(
        entry.key,
        existing && existing.kind === entry.kind ? updateSlot(existing, entry) : createSlot(entry),
      );
    }

    for (const [key, slot] of slots) {
      if (seen.has(key)) continue;
      slot.instance?.destroy?.();
      slot.el.remove();
      slots.delete(key);
    }

    // Insert only where the order actually differs. Re-appending a node that is
    // already in place would detach it, and detaching blurs a focused input.
    desired.forEach((entry, index) => {
      const node = slots.get(entry.key)?.el;
      if (!node) return;
      if (root.childNodes[index] !== node) root.insertBefore(node, root.childNodes[index] ?? null);
    });

    while (root.childNodes.length > desired.length) {
      root.removeChild(root.lastChild as ChildNode);
    }
  }

  let unsubscribe = current.store.subscribe(() => render());

  applyOptions();
  render();
  container.appendChild(root);

  return {
    el: root,

    update(next) {
      const storeChanged = next.store !== undefined && next.store !== current.store;
      current = { ...current, ...next };

      if (storeChanged) {
        unsubscribe();
        unsubscribe = current.store.subscribe(() => render());
      }

      applyOptions();
      render();
    },

    destroy() {
      unsubscribe();
      for (const slot of slots.values()) slot.instance?.destroy?.();
      slots.clear();
      root.remove();
    },
  };
}
