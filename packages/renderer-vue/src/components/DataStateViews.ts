import { defineComponent, h, type PropType } from 'vue';

export const DefaultDataLoading = defineComponent({
  name: 'MdmaDataLoading',
  props: { componentId: { type: String, required: true } },
  setup(props) {
    return () =>
      h('div', { class: 'mdma-data-loading', 'data-component-id': props.componentId }, 'Loading…');
  },
});

export const DefaultDataError = defineComponent({
  name: 'MdmaDataError',
  props: {
    componentId: { type: String, required: true },
    error: { type: String, required: true },
    onRetry: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    return () =>
      h('div', { class: 'mdma-data-error', 'data-component-id': props.componentId }, [
        h('span', props.error),
        h('button', { type: 'button', onClick: props.onRetry }, 'Retry'),
      ]);
  },
});

export const DefaultDataEmpty = defineComponent({
  name: 'MdmaDataEmpty',
  props: { componentId: { type: String, required: true } },
  setup(props) {
    return () =>
      h('div', { class: 'mdma-data-empty', 'data-component-id': props.componentId }, 'No data');
  },
});
