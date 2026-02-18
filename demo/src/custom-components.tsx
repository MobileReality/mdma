import { z } from 'zod';
import { memo } from 'react';
import { ComponentBaseSchema } from '@mdma/spec';
import { ChartRenderer } from './chart-components.js';
import type {
  MdmaBlockRendererProps,
  FormInputElementProps,
  FormSelectElementProps,
  FormCheckboxElementProps,
  FormTextareaElementProps,
  FormSubmitElementProps,
} from '@mdma/renderer-react';
import type { MdmaCustomizations } from './ChatView.js';
import { useEditableField, extractComponentId } from './chat/EditableMessageContext.js';

// ─── Progress ────────────────────────────────────────────────────────────────

export const ProgressSchema = ComponentBaseSchema.extend({
  type: z.literal('progress'),
  value: z.number().min(0),
  max: z.number().min(1).default(100),
  variant: z.enum(['default', 'success', 'warning', 'danger']).default('default'),
});

export const ProgressRenderer = memo(function ProgressRenderer({
  component,
}: MdmaBlockRendererProps) {
  const { value, max = 100, variant = 'default' } = component as unknown as z.infer<typeof ProgressSchema>;
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="mdma-progress" data-component-id={component.id}>
      {component.label && <span className="mdma-progress-label">{component.label}</span>}
      <div className="mdma-progress-track">
        <div
          className={`mdma-progress-fill mdma-progress-fill--${variant}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="mdma-progress-text">{pct}%</span>
    </div>
  );
});

// ─── Rating ──────────────────────────────────────────────────────────────────

export const RatingSchema = ComponentBaseSchema.extend({
  type: z.literal('rating'),
  maxStars: z.number().min(1).max(10).default(5),
  defaultValue: z.number().min(0).default(0),
});

export const RatingRenderer = memo(function RatingRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  const { maxStars = 5, defaultValue = 0 } = component as unknown as z.infer<typeof RatingSchema>;
  const current = (componentState?.values.value as number) ?? defaultValue;

  const handleClick = (star: number) => {
    dispatch({
      type: 'FIELD_CHANGED',
      componentId: component.id,
      field: 'value',
      value: star,
    });
  };

  return (
    <div className="mdma-rating" data-component-id={component.id}>
      {component.label && <span className="mdma-rating-label">{component.label}</span>}
      <div className="mdma-rating-stars">
        {Array.from({ length: maxStars }, (_, i) => {
          const star = i + 1;
          return (
            <button
              key={star}
              type="button"
              className={`mdma-rating-star ${star <= current ? 'mdma-rating-star--filled' : ''}`}
              onClick={() => handleClick(star)}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              {star <= current ? '\u2605' : '\u2606'}
            </button>
          );
        })}
      </div>
      {current > 0 && <span className="mdma-rating-value">{current}/{maxStars}</span>}
    </div>
  );
});

// ─── Metric ──────────────────────────────────────────────────────────────────

export const MetricSchema = ComponentBaseSchema.extend({
  type: z.literal('metric'),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  trend: z.enum(['up', 'down', 'flat']).optional(),
});

const TREND_ARROWS: Record<string, string> = {
  up: '\u2191',
  down: '\u2193',
  flat: '\u2192',
};

export const MetricRenderer = memo(function MetricRenderer({
  component,
}: MdmaBlockRendererProps) {
  const { value, unit, trend } = component as unknown as z.infer<typeof MetricSchema>;

  return (
    <div className="mdma-metric" data-component-id={component.id}>
      {component.label && <span className="mdma-metric-label">{component.label}</span>}
      <div className="mdma-metric-value-row">
        <span className="mdma-metric-value">{value}</span>
        {unit && <span className="mdma-metric-unit">{unit}</span>}
        {trend && (
          <span className={`mdma-metric-trend mdma-metric-trend--${trend}`}>
            {TREND_ARROWS[trend]}
          </span>
        )}
      </div>
    </div>
  );
});

// ─── Field type selector (shared by all editable form elements) ──────────────

const FIELD_TYPES = ['text', 'number', 'email', 'date', 'select', 'checkbox', 'textarea'] as const;

function FieldTypeSelector({
  currentType,
  componentId,
  fieldName,
}: {
  currentType: string;
  componentId: string;
  fieldName: string;
}) {
  const edit = useEditableField();
  if (!edit) return null;

  const handleChange = (newType: string) => {
    const changes: Record<string, string> = { type: newType };
    // When switching to select, auto-assign a data source if available
    if (newType === 'select' && edit.dataSourceNames.length > 0) {
      changes.options = edit.dataSourceNames[0];
    }
    edit.editField(componentId, fieldName, changes);
  };

  return (
    <select
      className="ce-field-type-selector"
      value={currentType}
      onChange={(e) => handleChange(e.target.value)}
      title="Change field type"
    >
      {FIELD_TYPES.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

// ─── Data source selector (for selects) ──────────────────────────────────────

function DataSourceSelector({
  componentId,
  fieldName,
}: {
  componentId: string;
  fieldName: string;
}) {
  const edit = useEditableField();
  if (!edit || edit.dataSourceNames.length === 0) return null;

  return (
    <select
      className="ce-field-ds-selector"
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) {
          edit.editField(componentId, fieldName, { options: e.target.value });
          e.target.value = '';
        }
      }}
      title="Switch data source"
    >
      <option value="" disabled>DS</option>
      {edit.dataSourceNames.map((ds) => (
        <option key={ds} value={ds}>{ds}</option>
      ))}
    </select>
  );
}

// ─── Custom Form Element Overrides (scoped) ─────────────────────────────────

function GlassInput({ id, type, value, onChange, required, name }: FormInputElementProps) {
  const edit = useEditableField();
  const componentId = extractComponentId(id, name);

  return (
    <div className="ce-editable-field">
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        className="ce-glass-input"
        placeholder={`Enter ${type}...`}
        onChange={(e) => onChange(e.target.value)}
      />
      {edit && <FieldTypeSelector currentType={type} componentId={componentId} fieldName={name} />}
    </div>
  );
}

function GlassSelect({ id, value, onChange, required, options, name, type }: FormSelectElementProps) {
  const edit = useEditableField();
  const componentId = extractComponentId(id, name);

  return (
    <div className="ce-editable-field">
      <select
        id={id}
        value={value}
        required={required}
        className="ce-glass-select"
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Pick one...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {edit && (
        <>
          <DataSourceSelector componentId={componentId} fieldName={name} />
          <FieldTypeSelector currentType={type} componentId={componentId} fieldName={name} />
        </>
      )}
    </div>
  );
}

function ToggleCheckbox({ id, checked, onChange, label, name }: FormCheckboxElementProps) {
  const edit = useEditableField();
  const componentId = extractComponentId(id, name);

  return (
    <div className="ce-editable-field">
      <label className="ce-toggle" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="ce-toggle-track" />
        <span className="ce-toggle-label">{checked ? 'On' : 'Off'}</span>
      </label>
      {edit && <FieldTypeSelector currentType="checkbox" componentId={componentId} fieldName={name} />}
    </div>
  );
}

function GlassTextarea({ id, value, onChange, required, name }: FormTextareaElementProps) {
  const edit = useEditableField();
  const componentId = extractComponentId(id, name);

  return (
    <div className="ce-editable-field">
      <textarea
        id={id}
        value={value}
        required={required}
        className="ce-glass-textarea"
        onChange={(e) => onChange(e.target.value)}
      />
      {edit && <FieldTypeSelector currentType="textarea" componentId={componentId} fieldName={name} />}
    </div>
  );
}

function GradientSubmitButton({ onClick, label }: FormSubmitElementProps) {
  return (
    <button type="button" className="ce-gradient-submit" onClick={onClick}>
      {label}
    </button>
  );
}

// ─── Custom Button (override) ────────────────────────────────────────────────

export const CustomButtonRenderer = memo(function CustomButtonRenderer({
  component,
  dispatch,
}: MdmaBlockRendererProps) {
  if (component.type !== 'button') return null;

  return (
    <button
      type="button"
      className={`custom-button custom-button--${component.variant ?? 'primary'}`}
      data-component-id={component.id}
      onClick={() =>
        dispatch({ type: 'ACTION_TRIGGERED', componentId: component.id, actionId: component.onAction })
      }
    >
      {component.text}
    </button>
  );
});

// ─── Custom Table (override) ─────────────────────────────────────────────────

export const CustomTableRenderer = memo(function CustomTableRenderer({
  component,
  resolveBinding,
}: MdmaBlockRendererProps) {
  if (component.type !== 'table') return null;

  const rawData = typeof component.data === 'string' ? resolveBinding(component.data) : component.data;
  const data = Array.isArray(rawData) ? rawData : [];

  return (
    <div className="custom-table" data-component-id={component.id}>
      {component.label && <h3 className="custom-table-label">{component.label}</h3>}
      <div className="custom-table-scroll">
        <table>
          <thead>
            <tr>
              {component.columns.map((col: { key: string; header: string; width?: string }) => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {component.columns.map((col: { key: string }) => (
                  <td key={col.key}>{String((row as Record<string, unknown>)[col.key] ?? '')}</td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={component.columns.length} className="custom-table-empty">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ─── Custom Callout (override) ───────────────────────────────────────────────

const CALLOUT_ICONS: Record<string, string> = {
  info: '\u2139\uFE0F',
  warning: '\u26A0\uFE0F',
  error: '\u274C',
  success: '\u2705',
};

export const CustomCalloutRenderer = memo(function CustomCalloutRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  if (component.type !== 'callout') return null;
  if (componentState?.values.dismissed) return null;

  const variant = component.variant ?? 'info';

  return (
    <div className={`custom-callout custom-callout--${variant}`} data-component-id={component.id} role="alert">
      <span className="custom-callout-icon">{CALLOUT_ICONS[variant] ?? CALLOUT_ICONS.info}</span>
      <div className="custom-callout-body">
        {component.title && <strong className="custom-callout-title">{component.title}</strong>}
        <p className="custom-callout-content">{component.content}</p>
      </div>
      {component.dismissible && (
        <button
          type="button"
          className="custom-callout-dismiss"
          aria-label="Dismiss"
          onClick={() =>
            dispatch({ type: 'FIELD_CHANGED', componentId: component.id, field: 'dismissed', value: true })
          }
        >
          &times;
        </button>
      )}
    </div>
  );
});

// ─── All customizations in a single object ──────────────────────────────────

export const customizations: MdmaCustomizations = {
  schemas: new Map<string, z.ZodType>([
    ['progress', ProgressSchema],
    ['rating', RatingSchema],
    ['metric', MetricSchema],
  ]),
  components: {
    // New types
    progress: ProgressRenderer,
    rating: RatingRenderer,
    metric: MetricRenderer,
    chart: ChartRenderer,
    // Built-in overrides
    button: CustomButtonRenderer,
    table: CustomTableRenderer,
    callout: CustomCalloutRenderer,
    // Form: sub-element overrides instead of full renderer
    form: {
      elements: {
        input: GlassInput,
        select: GlassSelect,
        checkbox: ToggleCheckbox,
        textarea: GlassTextarea,
        submitButton: GradientSubmitButton,
      },
    },
  },
  dataSources: {
    countries: [
      { label: 'United States', value: 'US' },
      { label: 'Canada', value: 'CA' },
      { label: 'United Kingdom', value: 'GB' },
      { label: 'Germany', value: 'DE' },
      { label: 'France', value: 'FR' },
      { label: 'Japan', value: 'JP' },
      { label: 'Australia', value: 'AU' },
      { label: 'Brazil', value: 'BR' },
      { label: 'India', value: 'IN' },
      { label: 'Mexico', value: 'MX' },
      { label: 'South Korea', value: 'KR' },
      { label: 'Italy', value: 'IT' },
      { label: 'Spain', value: 'ES' },
      { label: 'Netherlands', value: 'NL' },
      { label: 'Sweden', value: 'SE' },
      { label: 'Poland', value: 'PL' },
    ],
    departments: [
      { label: 'Engineering', value: 'engineering' },
      { label: 'Human Resources', value: 'hr' },
      { label: 'Finance', value: 'finance' },
      { label: 'Marketing', value: 'marketing' },
      { label: 'Sales', value: 'sales' },
      { label: 'Operations', value: 'operations' },
      { label: 'Legal', value: 'legal' },
      { label: 'Customer Support', value: 'support' },
    ],
  },
};
