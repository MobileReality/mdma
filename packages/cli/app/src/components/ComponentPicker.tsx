import type { ComponentConfig, ComponentType } from '../hooks/use-prompt-builder.js';

interface ComponentPickerProps {
  components: ComponentConfig[];
  onToggle: (type: ComponentType) => void;
}

const COMPONENT_INFO: Record<ComponentType, { label: string; description: string; icon: string }> = {
  form: { label: 'Form', description: 'Collect structured user input', icon: '📋' },
  button: { label: 'Button', description: 'Trigger actions on click', icon: '🔘' },
  tasklist: { label: 'Tasklist', description: 'Checklist with completion tracking', icon: '✅' },
  table: { label: 'Table', description: 'Display tabular data', icon: '📊' },
  callout: { label: 'Callout', description: 'Highlighted info/warning blocks', icon: '💡' },
  'approval-gate': { label: 'Approval Gate', description: 'Require approvals to proceed', icon: '🔒' },
  webhook: { label: 'Webhook', description: 'HTTP requests on action', icon: '🔗' },
  chart: { label: 'Chart', description: 'Data visualization', icon: '📈' },
  thinking: { label: 'Thinking', description: 'AI reasoning display', icon: '🧠' },
};

export function ComponentPicker({ components, onToggle }: ComponentPickerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#e0e0e0' }}>
        Components
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {components.map((comp) => {
          const info = COMPONENT_INFO[comp.type];
          return (
            <button
              key={comp.type}
              onClick={() => onToggle(comp.type)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 6px',
                border: comp.enabled ? '2px solid #6366f1' : '1px solid #333',
                borderRadius: '8px',
                background: comp.enabled ? '#1e1b4b' : '#1a1a1a',
                color: comp.enabled ? '#a5b4fc' : '#888',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontSize: '11px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '20px' }}>{info.icon}</span>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>{info.label}</span>
              <span style={{ fontSize: '10px', color: '#666', lineHeight: 1.2 }}>
                {info.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
