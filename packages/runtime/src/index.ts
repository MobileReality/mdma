export {
  createDocumentStore,
  type DocumentStore,
  type DocumentState,
  type DocumentStoreOptions,
} from './core/document-store.js';
export { createEventBus, type TypedEventBus, type EventHandler } from './core/event-bus.js';
export { createEventLog, type AppendOnlyEventLog, type EventLogOptions } from './core/event-log.js';
export {
  resolveBindingPath,
  resolveValue,
  parseBindingExpression,
} from './core/binding-resolver.js';
export { serializeFiles } from './core/serialize-files.js';
export { redactPayload, type RedactionContext } from './redaction/redactor.js';
export { hashValue } from './redaction/hash.js';
export {
  PolicyEngine,
  PolicyViolationError,
  createDefaultPolicy,
  type PolicyEvaluationResult,
} from './policy/policy-engine.js';
export {
  AttachableRegistry,
  type AttachableHandler,
  type AttachableContext,
  type ComponentState,
} from './attachable/registry.js';

// Enterprise features
export {
  ChainedEventLog,
  type ChainedEventLogEntry,
  type IntegrityVerificationResult,
} from './core/event-log-integrity.js';
export type { RedactionStrategy } from './redaction/strategies/types.js';
export { hashStrategy } from './redaction/strategies/hash-strategy.js';
export { maskStrategy } from './redaction/strategies/mask-strategy.js';
export { omitStrategy } from './redaction/strategies/omit-strategy.js';
export {
  detectPii,
  auditSensitiveFields,
  type PiiDetectionResult,
  type PiiType,
} from './redaction/pii-detector.js';
export {
  generateComplianceReport,
  type ComplianceReport,
  type ComplianceCheck,
} from './compliance/compliance-reporter.js';
