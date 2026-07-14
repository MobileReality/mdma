import type { MdmaMessageState } from '@mobile-reality/mdma-agui';

/** The id of a document's first real component — `thinking` blocks don't count. */
export function primaryComponentId(doc: MdmaMessageState): string | null {
  const children = (doc.ast?.children ?? []) as Array<{
    type?: string;
    component?: { id?: string; type?: string };
  }>;
  for (const child of children) {
    if (child.type === 'mdmaBlock' && child.component && child.component.type !== 'thinking') {
      return child.component.id ?? null;
    }
  }
  return null;
}
