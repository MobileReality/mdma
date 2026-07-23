import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

// Guards the toolchain itself: Vue renders through happy-dom, and components are
// authored as `h()` render functions rather than SFCs (no vue-tsc, no bundler).
describe('vue test environment', () => {
  it('mounts a render-function component into a DOM', () => {
    const Probe = defineComponent({
      setup() {
        return () => h('div', { class: 'mdma-probe' }, 'ok');
      },
    });

    const wrapper = mount(Probe);
    expect(wrapper.find('.mdma-probe').text()).toBe('ok');
  });
});
