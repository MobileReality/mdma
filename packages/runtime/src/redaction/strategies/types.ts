export interface RedactionStrategy {
  name: string;
  redact(value: unknown): unknown;
}
