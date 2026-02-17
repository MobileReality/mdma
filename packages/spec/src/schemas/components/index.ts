import { z } from 'zod';
import { FormComponentSchema } from './form.js';
import { ButtonComponentSchema } from './button.js';
import { TasklistComponentSchema } from './tasklist.js';
import { TableComponentSchema } from './table.js';
import { CalloutComponentSchema } from './callout.js';
import { ApprovalGateComponentSchema } from './approval-gate.js';
import { WebhookComponentSchema } from './webhook.js';

export { FormComponentSchema, type FormComponent, type FormField } from './form.js';
export { ButtonComponentSchema, type ButtonComponent } from './button.js';
export {
  TasklistComponentSchema,
  type TasklistComponent,
  type TaskItem,
} from './tasklist.js';
export { TableComponentSchema, type TableComponent, type TableColumn } from './table.js';
export { CalloutComponentSchema, type CalloutComponent } from './callout.js';
export {
  ApprovalGateComponentSchema,
  type ApprovalGateComponent,
} from './approval-gate.js';
export { WebhookComponentSchema, type WebhookComponent } from './webhook.js';

export const MdmaComponentSchema = z.discriminatedUnion('type', [
  FormComponentSchema,
  ButtonComponentSchema,
  TasklistComponentSchema,
  TableComponentSchema,
  CalloutComponentSchema,
  ApprovalGateComponentSchema,
  WebhookComponentSchema,
]);

export type MdmaComponent = z.infer<typeof MdmaComponentSchema>;

export const COMPONENT_TYPES = [
  'form',
  'button',
  'tasklist',
  'table',
  'callout',
  'approval-gate',
  'webhook',
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

/** Registry mapping component type names to their Zod schemas */
export const componentSchemaRegistry = new Map<string, z.ZodType>([
  ['form', FormComponentSchema],
  ['button', ButtonComponentSchema],
  ['tasklist', TasklistComponentSchema],
  ['table', TableComponentSchema],
  ['callout', CalloutComponentSchema],
  ['approval-gate', ApprovalGateComponentSchema],
  ['webhook', WebhookComponentSchema],
]);
