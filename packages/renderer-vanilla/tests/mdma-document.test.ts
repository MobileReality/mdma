import { beforeEach, describe, expect, it } from 'vitest';
import { mountMdmaDocument } from '../src/document/mount-document.js';
import { el } from '../src/dom/el.js';
import type { MdmaBlockRenderer } from '../src/renderers/renderer-props.js';
import { mdma, parseDoc } from './helpers/doc.js';

const BUTTON = mdma('type: button\nid: go\ntext: "Go"\nonAction: launch');

let container: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
});

describe('mountMdmaDocument', () => {
  it('renders markdown and blocks in source order', async () => {
    const { ast, store } = await parseDoc(`# Title\n\nSome prose.\n\n${BUTTON}`);
    const handle = mountMdmaDocument(container, { ast, store });

    expect(handle.el.className).toBe('mdma-document');
    expect(container.firstChild).toBe(handle.el);
    expect(handle.el.querySelector('h1')?.textContent).toBe('Title');
    expect(handle.el.lastElementChild?.className).toContain('mdma-button');
  });

  it('appends an extra class name', async () => {
    const { ast, store } = await parseDoc(BUTTON);
    const handle = mountMdmaDocument(container, { ast, store, className: 'chat-doc' });
    expect(handle.el.className).toBe('mdma-document chat-doc');
  });

  it('re-renders when the store changes, with no new AST', async () => {
    const { ast, store } = await parseDoc(
      mdma('type: approval-gate\nid: deploy\ntitle: "Ship it"'),
    );
    const handle = mountMdmaDocument(container, { ast, store });
    expect(handle.el.querySelector('.mdma-approval-gate--pending')).not.toBeNull();

    store.dispatch({
      type: 'APPROVAL_GRANTED',
      componentId: 'deploy',
      actor: { id: 'tester' },
    });

    expect(handle.el.querySelector('.mdma-approval-gate--approved')).not.toBeNull();
  });

  it('routes actions from a rendered component into the store', async () => {
    const { ast, store } = await parseDoc(BUTTON);
    const handle = mountMdmaDocument(container, { ast, store });
    const actions: string[] = [];
    store.getEventBus().on('ACTION_TRIGGERED', (action) => actions.push(action.actionId));

    handle.el.querySelector<HTMLButtonElement>('.mdma-button')?.click();

    expect(actions).toEqual(['launch']);
  });

  it('prefers a host renderer over the built-in', async () => {
    const Loud: MdmaBlockRenderer = () => {
      const node = el('div', { class: 'loud' }, ['LOUD']);
      return { el: node, update() {} };
    };

    const { ast, store } = await parseDoc(BUTTON);
    const handle = mountMdmaDocument(container, {
      ast,
      store,
      customizations: { components: { button: Loud } },
    });

    expect(handle.el.querySelector('.loud')).not.toBeNull();
    expect(handle.el.querySelector('.mdma-button')).toBeNull();
  });

  it('accepts a component config object carrying a renderer', async () => {
    const Quiet: MdmaBlockRenderer = () => ({ el: el('div', { class: 'quiet' }), update() {} });

    const { ast, store } = await parseDoc(BUTTON);
    const handle = mountMdmaDocument(container, {
      ast,
      store,
      customizations: { components: { button: { renderer: Quiet } } },
    });

    expect(handle.el.querySelector('.quiet')).not.toBeNull();
  });

  it('names an unknown component type instead of throwing', async () => {
    const { ast, store } = await parseDoc(BUTTON);
    const handle = mountMdmaDocument(container, { ast, store });

    // Swap the parsed component's type for one nothing renders.
    const block = ast.children.find(
      (child) => (child as { type?: string }).type === 'mdmaBlock',
    ) as { component: { type: string } };
    block.component.type = 'hologram';
    handle.update({ ast });

    expect(handle.el.querySelector('.mdma-unknown-component')?.textContent).toBe(
      'Unknown component type: hologram',
    );
  });

  it('stops listening to the store and detaches on destroy', async () => {
    const { ast, store } = await parseDoc(BUTTON);
    const handle = mountMdmaDocument(container, { ast, store });
    handle.destroy();

    expect(container.contains(handle.el)).toBe(false);
    // A dispatch after destroy must not throw from a stale subscription.
    expect(() =>
      store.dispatch({ type: 'ACTION_TRIGGERED', componentId: 'go', actionId: 'launch' }),
    ).not.toThrow();
  });

  it('swaps to a new store', async () => {
    const first = await parseDoc(BUTTON);
    const second = await parseDoc(mdma('type: button\nid: go\ntext: "Stop"\nonAction: halt'));

    const handle = mountMdmaDocument(container, { ast: first.ast, store: first.store });
    handle.update({ ast: second.ast, store: second.store });

    expect(handle.el.querySelector('.mdma-button')?.textContent).toBe('Stop');
  });
});
