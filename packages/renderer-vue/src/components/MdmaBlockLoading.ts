import { computed, defineComponent, h, type PropType } from 'vue';

export type MdmaBlockLoadingProps = {
  node: { value?: string };
};

/** Try to extract a component type hint from partial YAML (e.g. "type: form"). */
function extractTypeHint(yaml?: string): string | null {
  if (!yaml) return null;
  const match = yaml.match(/^\s*type:\s*(\S+)/m);
  return match ? match[1] : null;
}

/**
 * Skeleton shown for an `mdma` fence that hasn't finished streaming (or failed
 * validation). The type hint comes from the partial YAML so the placeholder can
 * name what is arriving instead of showing a generic spinner.
 */
export const MdmaBlockLoading = defineComponent({
  name: 'MdmaBlockLoading',
  props: {
    node: { type: Object as PropType<{ value?: string }>, required: true },
  },
  setup(props) {
    const typeHint = computed(() => extractTypeHint(props.node.value));

    return () =>
      h('div', { class: 'mdma-block-loading' }, [
        h('div', { class: 'mdma-block-loading-shimmer' }),
        h('div', { class: 'mdma-block-loading-content' }, [
          h('span', { class: 'mdma-block-loading-icon' }),
          h(
            'span',
            { class: 'mdma-block-loading-text' },
            typeHint.value ? `Loading ${typeHint.value} component...` : 'Loading component...',
          ),
        ]),
      ]);
  },
});
