export type Child = Node | string | number | false | null | undefined;

export interface ElementProps {
  class?: string;
  style?: Record<string, string>;
  dataset?: Record<string, string | undefined>;
  on?: Record<string, (event: Event) => void>;
  /** Anything else is set as an attribute; `undefined` and `false` are skipped. */
  [attribute: string]: unknown;
}

const SPECIAL = new Set(['class', 'style', 'dataset', 'on']);

/**
 * Create an element with attributes, inline styles, and listeners. Attributes
 * are used rather than DOM properties so the output matches what the `.mdma-*`
 * stylesheet and the framework renderers' markup expect.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (props.class) node.className = props.class;

  if (props.style) {
    for (const [key, value] of Object.entries(props.style)) node.style.setProperty(key, value);
  }

  if (props.dataset) {
    for (const [key, value] of Object.entries(props.dataset)) {
      if (value !== undefined) node.setAttribute(`data-${key}`, value);
    }
  }

  if (props.on) {
    for (const [type, handler] of Object.entries(props.on)) node.addEventListener(type, handler);
  }

  for (const [key, value] of Object.entries(props)) {
    if (SPECIAL.has(key) || value === undefined || value === false || value === null) continue;
    node.setAttribute(key, value === true ? '' : String(value));
  }

  append(node, children);
  return node;
}

export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}

export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * Write a value into an input without disturbing the user. Skipped entirely
 * while the field has focus: a streamed re-render must never move the caret or
 * clobber what is being typed.
 */
export function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  if (input.value === value || document.activeElement === input) return;
  input.value = value;
}
