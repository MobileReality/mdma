import { describe, it, expect } from 'vitest';
import { TableRenderer } from '../src/components/TableRenderer.js';
import { WebhookRenderer } from '../src/components/WebhookRenderer.js';
import { mdma } from './helpers/doc.js';
import { mountBlock } from './helpers/mount-block.js';

const TABLE = mdma(`
type: table
id: patients
label: "Patients"
columns:
  - key: name
    header: "Name"
  - key: ssn
    header: "SSN"
    sensitive: true
data:
  - name: "Ada"
    ssn: "123-45-6789"
  - name: "Grace"
    ssn: "987-65-4321"
`);

describe('TableRenderer', () => {
  it('renders a header per column and a row per record', async () => {
    const { wrapper } = await mountBlock(TABLE, TableRenderer);
    expect(wrapper.find('.mdma-table-label').text()).toBe('Patients');
    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual([
      expect.stringContaining('Name'),
      expect.stringContaining('SSN'),
    ]);
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
  });

  it('masks sensitive columns until a cell is clicked', async () => {
    const { wrapper } = await mountBlock(TABLE, TableRenderer);
    const cell = wrapper.find('.mdma-table-cell--sensitive');
    expect(cell.text()).toBe('•••••');
    expect(wrapper.text()).not.toContain('123-45-6789');

    await cell.trigger('click');
    expect(wrapper.find('.mdma-table-cell--sensitive').text()).toBe('123-45-6789');
  });

  it('badges the sensitive column header', async () => {
    const { wrapper } = await mountBlock(TABLE, TableRenderer);
    const badges = wrapper.findAll('thead .mdma-sensitive-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0].attributes('title')).toContain('Sensitive column');
  });

  it('shows an empty row when there is no data', async () => {
    const empty = mdma(`
type: table
id: nothing
columns:
  - key: a
    header: "A"
  - key: b
    header: "B"
data: []
`);
    const { wrapper } = await mountBlock(empty, TableRenderer);
    const cell = wrapper.find('.mdma-table-empty');
    expect(cell.text()).toBe('No data');
    expect(cell.attributes('colspan')).toBe('2');
  });

  it('resolves a bound data set through the store', async () => {
    const bound = mdma(`
type: table
id: bound
columns:
  - key: a
    header: "A"
data: "{{missing.rows}}"
`);
    // An unresolvable binding degrades to the empty state rather than throwing.
    const { wrapper } = await mountBlock(bound, TableRenderer);
    expect(wrapper.find('.mdma-table-empty').exists()).toBe(true);
  });
});

describe('WebhookRenderer', () => {
  const WEBHOOK = mdma(`
type: webhook
id: notify
label: "Notify ops"
url: "https://example.com/hook"
method: POST
trigger: notify-ops
`);

  it('starts idle with a trigger offered', async () => {
    const { wrapper } = await mountBlock(WEBHOOK, WebhookRenderer);
    expect(wrapper.find('.mdma-webhook-label').text()).toBe('Notify ops');
    expect(wrapper.find('.mdma-webhook-status').text()).toBe('Webhook: idle');
    expect(wrapper.find('.mdma-webhook-trigger').exists()).toBe(true);
  });

  it('reports the call and withdraws the trigger once fired', async () => {
    const { wrapper, store } = await mountBlock(WEBHOOK, WebhookRenderer);
    await wrapper.find('.mdma-webhook-trigger').trigger('click');

    expect(wrapper.find('.mdma-webhook-status').text()).toBe('Webhook: triggered');
    expect(wrapper.find('.mdma-webhook-trigger').exists()).toBe(false);
    expect(
      store
        .getEventLog()
        .entries()
        .some((e) => e.eventType === 'integration_called'),
    ).toBe(true);
  });
});
