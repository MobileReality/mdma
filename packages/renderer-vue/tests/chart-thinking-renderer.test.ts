import { describe, it, expect } from 'vitest';
import { ChartRenderer } from '../src/components/ChartRenderer.js';
import { ThinkingRenderer } from '../src/components/ThinkingRenderer.js';
import { mdma } from './helpers/doc.js';
import { mountBlock } from './helpers/mount-block.js';

describe('ChartRenderer', () => {
  const CHART = mdma(`
type: chart
id: sales
label: "Monthly sales"
variant: bar
data: |
  month,revenue
  Jan,120
  Feb,150
`);

  it('renders parsed CSV as a table', async () => {
    const { wrapper } = await mountBlock(CHART, ChartRenderer);
    expect(wrapper.find('.mdma-chart-label').text()).toBe('Monthly sales');
    expect(wrapper.find('.mdma-chart-variant').text()).toBe('bar chart');
    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual(['month', 'revenue']);
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    expect(wrapper.findAll('tbody tr')[1].text()).toContain('150');
  });

  it('shows an empty state when there are no rows', async () => {
    const empty = mdma(`
type: chart
id: none
data: "month,revenue"
`);
    const { wrapper } = await mountBlock(empty, ChartRenderer);
    expect(wrapper.find('.mdma-chart--empty').exists()).toBe(true);
    expect(wrapper.find('.mdma-chart-empty').text()).toBe('No chart data');
  });

  it('degrades to the empty state for an unresolvable binding', async () => {
    const bound = mdma(`
type: chart
id: bound
data: "{{missing.csv}}"
`);
    const { wrapper } = await mountBlock(bound, ChartRenderer);
    expect(wrapper.find('.mdma-chart--empty').exists()).toBe(true);
  });
});

describe('ThinkingRenderer', () => {
  const thinking = (yaml: string) => mountBlock(mdma(yaml), ThinkingRenderer);

  it('renders collapsed by default with its label', async () => {
    const { wrapper } = await thinking(`
type: thinking
id: t1
content: "Weighing the options"
`);
    const details = wrapper.find('details');
    expect(details.attributes('open')).toBeUndefined();
    expect(wrapper.find('.mdma-thinking-label').text()).toBe('Thinking');
    expect(wrapper.find('.mdma-thinking-content').text()).toBe('Weighing the options');
  });

  it('honours an explicit label and status', async () => {
    const { wrapper } = await thinking(`
type: thinking
id: t2
label: "Planning"
status: thinking
content: "..."
collapsed: false
`);
    expect(wrapper.find('.mdma-thinking').classes()).toContain('mdma-thinking--thinking');
    expect(wrapper.find('.mdma-thinking-indicator').exists()).toBe(true);
    expect(wrapper.find('details').attributes('open')).toBeDefined();
  });

  it('toggles through document state rather than the native details behaviour', async () => {
    const { wrapper, store } = await thinking(`
type: thinking
id: t3
content: "Reasoning"
`);
    await wrapper.find('summary').trigger('click');

    expect(store.getComponentState('t3')?.values.collapsed).toBe(false);
    expect(wrapper.find('details').attributes('open')).toBeDefined();
  });
});
