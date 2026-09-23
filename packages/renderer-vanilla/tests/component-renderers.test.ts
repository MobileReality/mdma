import { describe, expect, it } from 'vitest';
import { ApprovalGateRenderer } from '../src/components/ApprovalGateRenderer.js';
import { ButtonRenderer } from '../src/components/ButtonRenderer.js';
import { CalloutRenderer } from '../src/components/CalloutRenderer.js';
import { ChartRenderer } from '../src/components/ChartRenderer.js';
import { TableRenderer } from '../src/components/TableRenderer.js';
import { TasklistRenderer } from '../src/components/TasklistRenderer.js';
import { ThinkingRenderer } from '../src/components/ThinkingRenderer.js';
import { WebhookRenderer } from '../src/components/WebhookRenderer.js';
import { mdma } from './helpers/doc.js';
import { mountBlockFor } from './helpers/mount.js';

describe('ButtonRenderer', () => {
  const BUTTON = mdma('type: button\nid: go\ntext: "Go"\nvariant: danger\nonAction: launch');

  it('renders the variant class and text', async () => {
    const { instance } = await mountBlockFor(BUTTON, ButtonRenderer);
    expect(instance.el.className).toBe('mdma-button mdma-button--danger');
    expect(instance.el.textContent).toBe('Go');
  });

  it('dispatches its action on click', async () => {
    const { instance, store } = await mountBlockFor(BUTTON, ButtonRenderer);
    const actions: string[] = [];
    store.getEventBus().on('ACTION_TRIGGERED', (action) => actions.push(action.actionId));

    (instance.el as HTMLButtonElement).click();

    expect(actions).toEqual(['launch']);
  });
});

describe('CalloutRenderer', () => {
  const CALLOUT = mdma(
    'type: callout\nid: note\nvariant: warning\ntitle: "Heads up"\ncontent: "Be careful"\ndismissible: true',
  );

  it('renders the variant, title, and content', async () => {
    const { instance } = await mountBlockFor(CALLOUT, CalloutRenderer);
    expect(instance.el.className).toContain('mdma-callout--warning');
    expect(instance.el.querySelector('.mdma-callout-title')?.textContent).toBe('Heads up');
    expect(instance.el.querySelector('.mdma-callout-content')?.textContent).toBe('Be careful');
  });

  it('disappears once dismissed, and stays dismissed', async () => {
    const { instance, refresh } = await mountBlockFor(CALLOUT, CalloutRenderer);
    instance.el.querySelector<HTMLButtonElement>('.mdma-callout-dismiss')?.click();
    refresh();

    expect(instance.el.querySelector('.mdma-callout-content')).toBeNull();
  });
});

describe('TasklistRenderer', () => {
  const TASKS = mdma(`
type: tasklist
id: checks
label: "Preflight"
items:
  - id: fuel
    text: "Fuel"
  - id: doors
    text: "Doors"
onComplete: cleared
`);

  it('renders one item per task', async () => {
    const { instance } = await mountBlockFor(TASKS, TasklistRenderer);
    expect(instance.el.querySelectorAll('.mdma-tasklist-item')).toHaveLength(2);
    expect(instance.el.querySelector('.mdma-tasklist-label')?.textContent).toBe('Preflight');
  });

  it('dispatches per item and fires onComplete on the last tick', async () => {
    const { instance, store, refresh } = await mountBlockFor(TASKS, TasklistRenderer);
    const actions: string[] = [];
    store.getEventBus().on('ACTION_TRIGGERED', (action) => actions.push(action.actionId));

    const boxes = instance.el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    boxes[0].checked = true;
    boxes[0].dispatchEvent(new Event('change'));
    refresh();
    expect(actions).toEqual([]);

    boxes[1].checked = true;
    boxes[1].dispatchEvent(new Event('change'));
    refresh();

    expect(actions).toEqual(['cleared']);
    expect(store.getComponentState('checks')?.values.fuel).toBe(true);
  });

  it('keeps the same checkbox elements across an update', async () => {
    const { instance, refresh } = await mountBlockFor(TASKS, TasklistRenderer);
    const before = instance.el.querySelector('input[type="checkbox"]');
    refresh();
    expect(instance.el.querySelector('input[type="checkbox"]')).toBe(before);
  });
});

describe('TableRenderer', () => {
  const TABLE = mdma(`
type: table
id: people
label: "People"
columns:
  - key: name
    header: "Name"
  - key: ssn
    header: "SSN"
    sensitive: true
data:
  - name: "Ada"
    ssn: "123-45"
`);

  it('renders headers, a sensitive badge, and rows', async () => {
    const { instance } = await mountBlockFor(TABLE, TableRenderer);
    expect(instance.el.querySelector('.mdma-table-label')?.textContent).toBe('People');
    expect(instance.el.querySelectorAll('thead th')).toHaveLength(2);
    expect(instance.el.querySelector('.mdma-sensitive-badge')).not.toBeNull();
  });

  it('masks a sensitive cell until it is clicked', async () => {
    const { instance } = await mountBlockFor(TABLE, TableRenderer);
    const cell = instance.el.querySelector<HTMLElement>('.mdma-table-cell--sensitive');
    if (!cell) throw new Error('missing masked cell');

    expect(cell.textContent).toBe('•••••');
    cell.click();
    expect(cell.textContent).toBe('123-45');
  });

  it('keeps a revealed cell revealed across an update', async () => {
    const { instance, refresh } = await mountBlockFor(TABLE, TableRenderer);
    instance.el.querySelector<HTMLElement>('.mdma-table-cell--sensitive')?.click();
    refresh();

    expect(instance.el.querySelector('.mdma-table-cell--sensitive')?.textContent).toBe('123-45');
  });

  it('shows an empty state with no rows', async () => {
    const { instance } = await mountBlockFor(
      mdma('type: table\nid: empty\ncolumns:\n  - key: a\n    header: "A"\ndata: []'),
      TableRenderer,
    );
    expect(instance.el.querySelector('.mdma-table-empty')?.textContent).toBe('No data');
  });
});

describe('ApprovalGateRenderer', () => {
  const GATE = mdma('type: approval-gate\nid: deploy\ntitle: "Ship it"\ndescription: "To prod"');

  it('offers approve and deny while pending', async () => {
    const { instance } = await mountBlockFor(GATE, ApprovalGateRenderer);
    expect(instance.el.className).toContain('mdma-approval-gate--pending');
    expect(instance.el.querySelectorAll('.mdma-approval-gate-actions button')).toHaveLength(2);
  });

  it('records approval and drops the buttons', async () => {
    const { instance, store, refresh } = await mountBlockFor(GATE, ApprovalGateRenderer);
    instance.el.querySelector<HTMLButtonElement>('.mdma-button--primary')?.click();
    refresh();

    expect(store.getComponentState('deploy')?.values.status).toBe('approved');
    expect(instance.el.querySelector('.mdma-approval-gate-actions')).toBeNull();
  });
});

describe('WebhookRenderer', () => {
  const HOOK = mdma(
    'type: webhook\nid: notify\nlabel: "Notify"\nurl: "https://example.com/hook"\nmethod: POST\ntrigger: send',
  );

  it('shows the idle status and a trigger button', async () => {
    const { instance } = await mountBlockFor(HOOK, WebhookRenderer);
    expect(instance.el.querySelector('.mdma-webhook-status')?.textContent).toBe('Webhook: idle');
    expect(instance.el.querySelector('.mdma-webhook-trigger')).not.toBeNull();
  });

  it('reports triggered once fired, and stays triggered', async () => {
    const { instance, store, refresh } = await mountBlockFor(HOOK, WebhookRenderer);
    const integrations: string[] = [];
    store
      .getEventBus()
      .on('INTEGRATION_CALLED', (action) => integrations.push(action.integrationId));

    instance.el.querySelector<HTMLButtonElement>('.mdma-webhook-trigger')?.click();
    refresh();

    expect(integrations).toEqual(['webhook']);
    expect(instance.el.querySelector('.mdma-webhook-status')?.textContent).toBe(
      'Webhook: triggered',
    );
    expect(instance.el.querySelector('.mdma-webhook-trigger')).toBeNull();
  });
});

describe('ChartRenderer', () => {
  it('renders CSV data as a table', async () => {
    const { instance } = await mountBlockFor(
      mdma(
        'type: chart\nid: rev\nlabel: "Revenue"\nvariant: bar\ndata: |\n  q,amount\n  Q1,10\n  Q2,20',
      ),
      ChartRenderer,
    );

    expect(instance.el.querySelector('.mdma-chart-label')?.textContent).toBe('Revenue');
    expect(instance.el.querySelector('.mdma-chart-variant')?.textContent).toBe('bar chart');
    expect(instance.el.querySelectorAll('.mdma-chart-data tbody tr')).toHaveLength(2);
  });

  it('shows an empty state when there are no rows', async () => {
    const { instance } = await mountBlockFor(
      mdma('type: chart\nid: rev\nvariant: bar\ndata: ""'),
      ChartRenderer,
    );
    expect(instance.el.className).toContain('mdma-chart--empty');
  });
});

describe('ThinkingRenderer', () => {
  const THINKING = mdma(
    'type: thinking\nid: t1\nlabel: "Reasoning"\ncontent: "weighing options"\nstatus: thinking\ncollapsed: true',
  );

  it('renders a details element carrying the status', async () => {
    const { instance } = await mountBlockFor(THINKING, ThinkingRenderer);
    expect(instance.el.tagName).toBe('DETAILS');
    expect(instance.el.className).toContain('mdma-thinking--thinking');
    expect(instance.el.querySelector('.mdma-thinking-indicator')).not.toBeNull();
  });

  it('toggles through the store rather than the native summary', async () => {
    const { instance, store, refresh } = await mountBlockFor(THINKING, ThinkingRenderer);
    instance.el.querySelector<HTMLElement>('.mdma-thinking-summary')?.click();
    refresh();

    expect(store.getComponentState('t1')?.values.collapsed).toBe(false);
    expect(instance.el.hasAttribute('open')).toBe(true);
  });
});
