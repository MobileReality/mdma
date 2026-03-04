import { describe, it, expect } from 'vitest';
import { extractBindings } from '../src/bindings/extract-bindings.js';
import { buildBindingGraph } from '../src/bindings/binding-graph.js';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

describe('extractBindings', () => {
  it('extracts bindings from a string', () => {
    const refs = extractBindings('comp1', '{{user_name}}', 'label');
    expect(refs).toHaveLength(1);
    expect(refs[0].path).toBe('user_name');
    expect(refs[0].expression).toBe('{{user_name}}');
    expect(refs[0].componentId).toBe('comp1');
  });

  it('extracts nested path bindings', () => {
    const refs = extractBindings('c', '{{user.profile.name}}', 'field');
    expect(refs[0].path).toBe('user.profile.name');
  });

  it('extracts bindings from objects', () => {
    const refs = extractBindings('c', { url: '{{api_url}}', body: { msg: '{{message}}' } });
    expect(refs).toHaveLength(2);
    expect(refs.map((r) => r.path).sort()).toEqual(['api_url', 'message']);
  });

  it('extracts bindings from arrays', () => {
    const refs = extractBindings('c', ['{{a}}', '{{b}}']);
    expect(refs).toHaveLength(2);
  });

  it('returns empty for non-binding values', () => {
    expect(extractBindings('c', 42)).toHaveLength(0);
    expect(extractBindings('c', true)).toHaveLength(0);
    expect(extractBindings('c', null)).toHaveLength(0);
    expect(extractBindings('c', 'plain text')).toHaveLength(0);
  });
});

describe('buildBindingGraph', () => {
  it('builds graph from MdmaRoot', () => {
    const root: MdmaRoot = {
      type: 'root',
      children: [
        {
          type: 'mdmaBlock',
          rawYaml: '',
          component: {
            id: 'tbl',
            type: 'table',
            columns: [{ key: 'name', header: 'Name' }],
            data: '{{items}}',
            visible: '{{show}}',
            sensitive: false,
            disabled: false,
            sortable: false,
            filterable: false,
          },
          children: [],
        },
      ],
    };

    const graph = buildBindingGraph(root);
    expect(graph.paths.has('items')).toBe(true);
    expect(graph.paths.has('show')).toBe(true);
    expect(graph.bindings).toHaveLength(2);
    expect(graph.byComponent.get('tbl')).toHaveLength(2);
  });
});
