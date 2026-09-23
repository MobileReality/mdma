import { beforeEach, describe, expect, it } from 'vitest';
import { mountMdmaDocument } from '../src/document/mount-document.js';
import { mdma, parseAst, parseDoc } from './helpers/doc.js';

const FORM = mdma(`
type: form
id: intake
label: "Intake"
fields:
  - name: full-name
    type: text
    label: "Full Name"
  - name: notes
    type: textarea
    label: "Notes"
onSubmit: submit-intake
`);

let container: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
});

/**
 * The reason this renderer needs a reconciler at all: a streamed reply re-parses
 * on every chunk, so the document is handed a brand-new AST many times a second
 * while the user is typing into a form it already drew.
 */
describe('streaming re-parse', () => {
  it('keeps a typed value and the caret when the AST is replaced', async () => {
    const { ast, store } = await parseDoc(FORM);
    const handle = mountMdmaDocument(container, { ast, store });

    const input = handle.el.querySelector<HTMLInputElement>('#intake-full-name');
    if (!input) throw new Error('input not rendered');

    input.focus();
    input.value = 'Ada Lo';
    input.dispatchEvent(new Event('input'));

    const reparsed = await parseAst(`${FORM}\nSome trailing prose still streaming`);
    handle.update({ ast: reparsed });

    const after = handle.el.querySelector<HTMLInputElement>('#intake-full-name');
    expect(after).toBe(input);
    expect(after?.value).toBe('Ada Lo');
    expect(document.activeElement).toBe(after);
  });

  it('never writes over the field the user is focused in', async () => {
    const { ast, store } = await parseDoc(FORM);
    const handle = mountMdmaDocument(container, { ast, store });

    const input = handle.el.querySelector<HTMLInputElement>('#intake-full-name');
    if (!input) throw new Error('input not rendered');

    input.focus();
    // A half-typed value the store has not been told about yet.
    input.value = 'partial typing';
    handle.update({ ast: await parseAst(FORM) });

    expect(handle.el.contains(input)).toBe(true);
    expect(input.value).toBe('partial typing');
  });

  it('keeps focus when prose arrives above a block', async () => {
    const { ast, store } = await parseDoc(FORM);
    const handle = mountMdmaDocument(container, { ast, store });

    const input = handle.el.querySelector<HTMLInputElement>('#intake-full-name');
    if (!input) throw new Error('input not rendered');
    input.focus();

    handle.update({ ast: await parseAst(`Some intro prose\n\n${FORM}`) });

    expect(handle.el.children).toHaveLength(2);
    expect(handle.el.contains(input)).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('renders two blocks sharing an id and keeps focus in either', async () => {
    const twice = `${FORM}\n${FORM}`;
    const { ast, store } = await parseDoc(twice);
    const handle = mountMdmaDocument(container, { ast, store });

    expect(handle.el.querySelectorAll('.mdma-form')).toHaveLength(2);

    for (const index of [0, 1]) {
      const input = handle.el.querySelectorAll<HTMLInputElement>('#intake-full-name')[index];
      if (!input) throw new Error(`input ${index} not rendered`);
      input.focus();

      handle.update({ ast: await parseAst(twice) });

      expect(handle.el.querySelectorAll('.mdma-form')).toHaveLength(2);
      expect(handle.el.contains(input)).toBe(true);
      expect(document.activeElement).toBe(input);
    }
  });

  it('keeps the value of a focused select across a re-parse', async () => {
    const withSelect = mdma(`
type: form
id: pick
fields:
  - name: letter
    type: select
    label: "Letter"
    options:
      - { label: "A", value: a }
      - { label: "B", value: b }
onSubmit: submit-pick
`);
    const { ast, store } = await parseDoc(withSelect);
    const handle = mountMdmaDocument(container, { ast, store });

    const select = handle.el.querySelector<HTMLSelectElement>('#pick-letter');
    if (!select) throw new Error('select not rendered');
    const optionB = select.options[2];

    select.focus();
    select.value = 'b';
    handle.update({ ast: await parseAst(withSelect) });

    expect(handle.el.querySelector('#pick-letter')).toBe(select);
    expect(select.value).toBe('b');
    expect(select.options[2]).toBe(optionB);
    expect(document.activeElement).toBe(select);
  });

  it('guards a focused field inside a shadow root', async () => {
    const host = document.createElement('div');
    container.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);

    const { ast, store } = await parseDoc(FORM);
    const handle = mountMdmaDocument(inner, { ast, store });

    const input = handle.el.querySelector<HTMLInputElement>('#intake-full-name');
    if (!input) throw new Error('input not rendered');
    input.focus();
    input.value = 'partial typing';

    store.dispatch({
      type: 'FIELD_CHANGED',
      componentId: 'intake',
      field: 'full-name',
      value: 'from the store',
    });

    expect(shadow.activeElement).toBe(input);
    expect(input.value).toBe('partial typing');
  });

  it('holds the last parsed block when a fence briefly reverts to pending', async () => {
    const { ast, store } = await parseDoc(FORM);
    const handle = mountMdmaDocument(container, { ast, store });
    expect(handle.el.querySelector('.mdma-form')).not.toBeNull();

    // Mid-stream the closing fence has not arrived yet, so the block parses as a
    // pending code node again. It must not flicker back to the skeleton.
    const midStream = await parseAst('```mdma\ntype: form\nid: intake\nfields:\n');
    handle.update({ ast: midStream });

    expect(handle.el.querySelector('.mdma-form')).not.toBeNull();
    expect(handle.el.querySelector('.mdma-block-loading')).toBeNull();
  });

  it('shows a typed skeleton for a fence with no id yet', async () => {
    const { ast, store } = await parseDoc('# Title\n');
    const handle = mountMdmaDocument(container, { ast, store });

    handle.update({ ast: await parseAst('# Title\n\n```mdma\ntype: table\n') });

    const skeleton = handle.el.querySelector('.mdma-block-loading-text');
    expect(skeleton?.textContent).toBe('Loading table component...');
  });

  it('streams a thinking block content live instead of a skeleton', async () => {
    const { ast, store } = await parseDoc('# Title\n');
    const handle = mountMdmaDocument(container, { ast, store });

    handle.update({
      ast: await parseAst(
        '```mdma\ntype: thinking\nid: t1\nlabel: Planning\ncontent: |\n  step one\n',
      ),
    });

    expect(handle.el.querySelector('.mdma-thinking-label')?.textContent).toBe('Planning');
    // A YAML block scalar keeps its trailing newline, so compare on the trimmed text.
    expect(handle.el.querySelector('.mdma-thinking-content')?.textContent?.trim()).toBe('step one');
  });

  it('adds later blocks without rebuilding the earlier ones', async () => {
    const { ast, store } = await parseDoc(FORM);
    const handle = mountMdmaDocument(container, { ast, store });
    const form = handle.el.querySelector('.mdma-form');

    const grown = await parseAst(
      `${FORM}\n${mdma('type: button\nid: go\ntext: "Go"\nonAction: go')}`,
    );
    handle.update({ ast: grown });

    expect(handle.el.querySelector('.mdma-form')).toBe(form);
    expect(handle.el.querySelector('.mdma-button')).not.toBeNull();
    expect(handle.el.children).toHaveLength(2);
  });

  it('remounts a block whose type completes into a different one', async () => {
    // Mid-stream `approval-gate` can briefly parse as a truncated type. When the
    // real type lands, the block must switch renderers rather than be updated in
    // the one the truncated type resolved to.
    const { ast, store } = await parseDoc(mdma('type: button\nid: gate\ntext: "…"\nonAction: x'));
    const handle = mountMdmaDocument(container, { ast, store });
    expect(handle.el.querySelector('.mdma-button')).not.toBeNull();

    const completed = await parseAst(mdma('type: approval-gate\nid: gate\ntitle: "Ship it"'));
    handle.update({ ast: completed });

    // The gate renders its own `.mdma-button` children, so assert on the block root.
    expect(handle.el.children).toHaveLength(1);
    expect(handle.el.firstElementChild?.className).toContain('mdma-approval-gate');
  });

  it('drops blocks that leave the AST', async () => {
    const { ast, store } = await parseDoc(
      `${FORM}${mdma('type: button\nid: go\ntext: "Go"\nonAction: go')}`,
    );
    const handle = mountMdmaDocument(container, { ast, store });
    expect(handle.el.querySelector('.mdma-button')).not.toBeNull();

    handle.update({ ast: await parseAst(FORM) });
    expect(handle.el.querySelector('.mdma-button')).toBeNull();
  });
});
