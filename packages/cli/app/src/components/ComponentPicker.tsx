import type { ComponentConfig, ComponentType } from '../hooks/use-prompt-builder.js';

interface ComponentPickerProps {
  components: ComponentConfig[];
  onToggle: (type: ComponentType) => void;
}

const COMPONENT_INFO: Record<ComponentType, { label: string; description: string; icon: string }> =
  {
    form: { label: 'Form', description: 'Collect structured user input', icon: '\uD83D\uDCCB' },
    button: { label: 'Button', description: 'Trigger actions on click', icon: '\uD83D\uDD18' },
    tasklist: {
      label: 'Tasklist',
      description: 'Checklist with completion tracking',
      icon: '\u2705',
    },
    table: { label: 'Table', description: 'Display tabular data', icon: '\uD83D\uDCCA' },
    callout: {
      label: 'Callout',
      description: 'Highlighted info/warning blocks',
      icon: '\uD83D\uDCA1',
    },
    'approval-gate': {
      label: 'Approval Gate',
      description: 'Require approvals to proceed',
      icon: '\uD83D\uDD12',
    },
    webhook: { label: 'Webhook', description: 'HTTP requests on action', icon: '\uD83D\uDD17' },
    chart: { label: 'Chart', description: 'Data visualization', icon: '\uD83D\uDCC8' },
    thinking: { label: 'Thinking', description: 'AI reasoning display', icon: '\uD83E\uDDE0' },
  };

export function ComponentPicker({ components, onToggle }: ComponentPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 text-sm font-semibold text-text-primary">Components</h3>
      <div className="grid grid-cols-3 gap-2">
        {components.map((comp) => {
          const info = COMPONENT_INFO[comp.type];
          return (
            <button
              key={comp.type}
              type="button"
              onClick={() => onToggle(comp.type)}
              className={`
                flex flex-col items-center gap-1 p-2.5 rounded-lg cursor-pointer transition-all text-center
                ${
                  comp.enabled
                    ? 'border-2 border-primary bg-primary-light text-primary-text shadow-sm shadow-primary/10'
                    : 'border border-border bg-surface-2 text-text-secondary hover:bg-surface-3 hover:border-border'
                }
              `}
            >
              <span className="text-xl">{info.icon}</span>
              <span className="font-semibold text-xs">{info.label}</span>
              <span className="text-[10px] text-text-muted leading-tight">{info.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
