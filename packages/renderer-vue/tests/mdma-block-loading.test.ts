import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { MdmaBlockLoading } from '../src/components/MdmaBlockLoading.js';

const mountLoading = (value?: string) => mount(MdmaBlockLoading, { props: { node: { value } } });

describe('MdmaBlockLoading', () => {
  it('names the component type when the partial YAML already declares one', () => {
    const wrapper = mountLoading('type: form\nid: intake');
    expect(wrapper.find('.mdma-block-loading-text').text()).toBe('Loading form component...');
  });

  it('falls back to a generic message before the type has streamed in', () => {
    expect(mountLoading('id: intake').find('.mdma-block-loading-text').text()).toBe(
      'Loading component...',
    );
    expect(mountLoading(undefined).find('.mdma-block-loading-text').text()).toBe(
      'Loading component...',
    );
  });

  it('renders the shimmer skeleton', () => {
    const wrapper = mountLoading('type: table');
    expect(wrapper.find('.mdma-block-loading-shimmer').exists()).toBe(true);
    expect(wrapper.find('.mdma-block-loading-icon').exists()).toBe(true);
  });

  it('updates the hint as more YAML arrives', async () => {
    const wrapper = mountLoading('id: intake');
    expect(wrapper.text()).toContain('Loading component...');

    await wrapper.setProps({ node: { value: 'id: intake\ntype: chart' } });
    expect(wrapper.text()).toContain('Loading chart component...');
  });
});
