import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref, type Component } from 'vue';
import {
  ElementOverridesProvider,
  useElementOverride,
  type ElementOverrides,
} from '../src/context/ElementOverridesContext.js';
import { CustomVariantProvider, useCustomVariants } from '../src/context/CustomVariantContext.js';

const Scoped = defineComponent({ setup: () => () => h('b', 'scoped') });
const Global = defineComponent({ setup: () => () => h('b', 'global') });

/** Renders the name of whatever override resolves for (scope, element), or `none`. */
function probe(scope: string, element: string): Component {
  return defineComponent({
    setup() {
      const Override = useElementOverride(scope, element);
      return () => (Override.value ? h(Override.value) : h('b', 'none'));
    },
  });
}

function mountWith(overrides: ElementOverrides | undefined, scope: string, element: string) {
  return mount(ElementOverridesProvider, {
    props: { value: overrides },
    slots: { default: () => h(probe(scope, element)) },
  });
}

describe('useElementOverride', () => {
  it('prefers a scope-specific override', () => {
    const overrides = { form: { input: Scoped }, '*': { input: Global } };
    expect(mountWith(overrides, 'form', 'input').text()).toBe('scoped');
  });

  it("falls back to the global '*' scope", () => {
    const overrides = { form: { checkbox: Scoped }, '*': { input: Global } };
    expect(mountWith(overrides, 'form', 'input').text()).toBe('global');
  });

  it('falls through to the built-in default when neither matches', () => {
    expect(mountWith({ table: { input: Scoped } }, 'form', 'input').text()).toBe('none');
    expect(mountWith(undefined, 'form', 'input').text()).toBe('none');
  });

  it('resolves to the built-in default with no provider above', () => {
    expect(mount(probe('form', 'input')).text()).toBe('none');
  });

  it('tracks a changed overrides map', async () => {
    const Host = defineComponent({
      setup() {
        const overrides = ref<ElementOverrides | undefined>(undefined);
        return { overrides };
      },
      render() {
        return h(
          ElementOverridesProvider,
          { value: this.overrides },
          {
            default: () => h(probe('form', 'input')),
          },
        );
      },
    });

    const wrapper = mount(Host);
    expect(wrapper.text()).toBe('none');

    wrapper.vm.overrides = { form: { input: Scoped } };
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toBe('scoped');
  });
});

describe('useCustomVariants', () => {
  const Variant = defineComponent({ setup: () => () => h('b', 'pad') });

  const VariantProbe = defineComponent({
    setup() {
      const variants = useCustomVariants();
      return () => {
        const Match = variants.value['signature-pad'];
        return Match ? h(Match) : h('b', 'unknown');
      };
    },
  });

  it('exposes registered variants by name', () => {
    const wrapper = mount(CustomVariantProvider, {
      props: { value: { 'signature-pad': Variant } },
      slots: { default: () => h(VariantProbe) },
    });
    expect(wrapper.text()).toBe('pad');
  });

  it('is an empty map when unset or absent', () => {
    const wrapper = mount(CustomVariantProvider, {
      props: {},
      slots: { default: () => h(VariantProbe) },
    });
    expect(wrapper.text()).toBe('unknown');
    expect(mount(VariantProbe).text()).toBe('unknown');
  });
});
