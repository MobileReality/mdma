import { defineComponent, h, ref } from 'vue';
import { blockRendererProps } from '../renderers/renderer-props.js';

/** A PII cell, masked until the reader clicks to reveal it. */
const MaskedCell = defineComponent({
  name: 'MdmaMaskedCell',
  props: {
    value: { type: String, required: true },
  },
  setup(props) {
    const revealed = ref(false);
    return () =>
      h(
        'span',
        {
          class: 'mdma-table-cell--sensitive',
          title: revealed.value ? 'Click to mask' : 'Click to reveal',
          onClick: () => {
            revealed.value = !revealed.value;
          },
        },
        revealed.value ? props.value : '•••••',
      );
  },
});

export const TableRenderer = defineComponent({
  name: 'TableRenderer',
  props: blockRendererProps,
  setup(props) {
    return () => {
      const component = props.component;
      if (component.type !== 'table') return null;

      const rawData =
        typeof component.data === 'string' ? props.resolveBinding(component.data) : component.data;
      const data = Array.isArray(rawData) ? rawData : [];

      const sensitiveKeys = new Set(
        component.columns.filter((col) => col.sensitive).map((col) => col.key),
      );

      return h('div', { class: 'mdma-table', 'data-component-id': component.id }, [
        component.label ? h('h3', { class: 'mdma-table-label' }, component.label) : null,
        h('table', [
          h('thead', [
            h(
              'tr',
              component.columns.map((col) =>
                h('th', { key: col.key, style: col.width ? { width: col.width } : undefined }, [
                  col.header,
                  col.sensitive
                    ? h(
                        'span',
                        { class: 'mdma-sensitive-badge', title: 'Sensitive column (PII)' },
                        '\u{1F512}',
                      )
                    : null,
                ]),
              ),
            ),
          ]),
          h('tbody', [
            ...data.map((row, i) =>
              h(
                'tr',
                { key: i },
                component.columns.map((col) => {
                  const raw = (row as Record<string, unknown>)[col.key] ?? '';
                  // A cell may itself hold a binding expression, e.g. "{{user.name}}".
                  const resolved =
                    typeof raw === 'string' && /^\{\{.+\}\}$/.test(raw)
                      ? props.resolveBinding(raw)
                      : raw;
                  const cellValue = String(resolved ?? '');
                  return h(
                    'td',
                    { key: col.key },
                    sensitiveKeys.has(col.key) && cellValue
                      ? h(MaskedCell, { value: cellValue })
                      : cellValue,
                  );
                }),
              ),
            ),
            data.length === 0
              ? h('tr', [
                  h(
                    'td',
                    { colspan: component.columns.length, class: 'mdma-table-empty' },
                    'No data',
                  ),
                ])
              : null,
          ]),
        ]),
      ]);
    };
  },
});
