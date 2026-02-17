export const ErrorCodes = {
  YAML_PARSE_ERROR: 'mdma/yaml-parse-error',
  SCHEMA_VALIDATION_ERROR: 'mdma/schema-validation-error',
  UNKNOWN_COMPONENT_TYPE: 'mdma/unknown-component-type',
  DUPLICATE_COMPONENT_ID: 'mdma/duplicate-component-id',
  INVALID_BINDING: 'mdma/invalid-binding',
  UNRESOLVED_BINDING: 'mdma/unresolved-binding',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
