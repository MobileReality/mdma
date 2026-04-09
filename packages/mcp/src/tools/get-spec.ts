import {
  COMPONENT_TYPES,
  componentSchemaRegistry,
  MDMA_SPEC_VERSION,
  MDMA_LANG_TAG,
  ComponentBaseSchema,
  BindingExpressionSchema,
} from '@mobile-reality/mdma-spec';
import { zodToJsonSchema } from 'zod-to-json-schema';

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
      examples: [
        '{{contact-form.email}}',
        '{{order-table.selected}}',
        '{{approval-gate.status}}',
      ],
    },
    components,
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
    ],
  };
}
