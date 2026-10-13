import {
  BindingExpressionSchema,
  COMPONENT_TYPES,
  ComponentBaseSchema,
  DataSourceDescriptorSchema,
  DataSourceRefSchema,
  MDMA_LANG_TAG,
  MDMA_SPEC_VERSION,
  componentSchemaRegistry,
} from '@mobile-reality/mdma-spec';
import { zodToJsonSchema } from 'zod-to-json-schema';

const DATA_SOURCE_KINDS = {
  rows: 'Tabular records for table.data (columns: key, type, optional description, sensitive). Table column keys must be columns of the source.',
  series: 'Plottable records for chart.data; chart xAxis / yAxis must be columns of the source.',
  options:
    'Choices for a form select field: fields[].options is the { source, params } ref instead of a literal [{label, value}] list.',
};

function getDataSourcesSpec() {
  return {
    description:
      'External data sources are registered by the host application and referenced from documents as { source, params } instead of generating rows, options, or CSV inline. ' +
      'Allowed in form select field options, table.data, and chart.data. The LLM never produces the data; the runtime resolves it.',
    ref: zodToJsonSchema(DataSourceRefSchema, { name: 'DataSourceRef', target: 'openApi3' }),
    descriptor: zodToJsonSchema(DataSourceDescriptorSchema, {
      name: 'DataSourceDescriptor',
      target: 'openApi3',
    }),
    definition:
      'DataSourceDefinition = DataSourceDescriptor + optional resolve: a static array of rows, or an async resolver (request, { signal }) => { rows, total? }. ' +
      'Create with defineDataSource(); register with createDocumentStore(ast, { dataSources }). The descriptor part is the catalog given to the LLM prompt and the validator.',
    kinds: DATA_SOURCE_KINDS,
    examples: [
      'data:\n  source: incidents\n  params: { status: open }',
      'options:\n  source: departments',
    ],
    rules: [
      'Reference only source names present in the catalog; never invent a source or fabricate its data',
      'The referenced source kind must match the slot: select options need options, table.data needs rows, chart.data needs series',
      'Params must match the declared type, respect allowed values, and include all required params; a param may be a {{binding}}',
      'The same underlying data may be offered as a rows source and a series source under different names',
    ],
  };
}

export function getSpec() {
  const components: Record<string, unknown> = {};
  for (const type of COMPONENT_TYPES) {
    const schema = componentSchemaRegistry.get(type);
    if (schema) {
      components[type] = zodToJsonSchema(schema, { name: type, target: 'openApi3' });
    }
  }

  return {
    specVersion: MDMA_SPEC_VERSION,
    langTag: MDMA_LANG_TAG,
    componentTypes: [...COMPONENT_TYPES],
    baseFields: zodToJsonSchema(ComponentBaseSchema, { name: 'ComponentBase', target: 'openApi3' }),
    bindingSyntax: {
      schema: zodToJsonSchema(BindingExpressionSchema, {
        name: 'BindingExpression',
        target: 'openApi3',
      }),
      description:
        'Bindings use {{component-id.field}} syntax to reference values from other components. ' +
        'Double braces required, no whitespace inside. Component IDs must be kebab-case.',
      examples: ['{{contact-form.email}}', '{{order-table.selected}}', '{{approval-gate.status}}'],
    },
    components,
    dataSources: getDataSourcesSpec(),
    authoringRules: [
      'Every component must have a unique kebab-case id',
      'PII fields (email, phone, SSN, address, etc.) must have sensitive: true',
      'Every response must start with a thinking block',
      'Each ```mdma block contains exactly one component in YAML',
      'Do not use --- (YAML document separators) inside mdma blocks',
      'Bindings use {{component-id.field}} syntax with double braces',
      'Select fields must have options as [{label, value}] objects',
      'Action targets (onSubmit, onAction, trigger) must reference existing component IDs',
      'Form fields must have a label',
      'Table columns must have a header',
      'Data from external data sources is referenced with { source, params }, never generated inline when a catalog is provided',
    ],
  };
}
