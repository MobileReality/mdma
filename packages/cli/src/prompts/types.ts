export type ComponentType =
  | 'form'
  | 'button'
  | 'tasklist'
  | 'table'
  | 'callout'
  | 'approval-gate'
  | 'webhook'
  | 'chart'
  | 'thinking';

export interface FormFieldConfig {
  name: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'checkbox' | 'textarea';
  label: string;
  required: boolean;
  sensitive: boolean;
}

export interface ApprovalConfig {
  roles: string[];
  requiredApprovers: number;
  requireReason: boolean;
}

export interface TasklistConfig {
  items: string[];
}

export interface TableConfig {
  columns: { key: string; header: string }[];
}

export interface ComponentConfig {
  type: ComponentType;
  enabled: boolean;
  form?: { fields: FormFieldConfig[] };
  approvalGate?: ApprovalConfig;
  tasklist?: TasklistConfig;
  table?: TableConfig;
}

export type TriggerMode = 'keyword' | 'immediate' | 'contextual';

export interface DomainConfig {
  name: string;
  domain: string;
  description: string;
  businessRules: string;
  triggerMode: TriggerMode;
  trigger: string;
}
