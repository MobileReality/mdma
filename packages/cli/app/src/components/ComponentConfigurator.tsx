import type { ComponentConfig, ComponentType } from '../hooks/use-prompt-builder.js';
import { FormConfig } from './configurators/FormConfig.js';
import { ApprovalConfig } from './configurators/ApprovalConfig.js';
import { TasklistConfig } from './configurators/TasklistConfig.js';
import { TableConfig } from './configurators/TableConfig.js';

interface ComponentConfiguratorProps {
  components: ComponentConfig[];
  onUpdate: (type: ComponentType, update: Partial<ComponentConfig>) => void;
}

export function ComponentConfigurator({ components, onUpdate }: ComponentConfiguratorProps) {
  const enabled = components.filter((c) => c.enabled && c.type !== 'thinking');

  if (enabled.length === 0) {
    return (
      <p className="text-text-muted text-sm italic">
        Select components above to configure them.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="m-0 text-sm font-semibold text-text-primary">Configure Components</h3>
      {enabled.map((comp) => (
        <ConfigPanel key={comp.type} config={comp} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

function ConfigPanel({
  config,
  onUpdate,
}: {
  config: ComponentConfig;
  onUpdate: (type: ComponentType, update: Partial<ComponentConfig>) => void;
}) {
  switch (config.type) {
    case 'form':
      return <FormConfig config={config} onUpdate={onUpdate} />;
    case 'approval-gate':
      return <ApprovalConfig config={config} onUpdate={onUpdate} />;
    case 'tasklist':
      return <TasklistConfig config={config} onUpdate={onUpdate} />;
    case 'table':
      return <TableConfig config={config} onUpdate={onUpdate} />;
    default:
      return (
        <div className="flex flex-col gap-2 p-2.5 border border-border rounded-md bg-surface-1">
          <span className="text-[13px] font-semibold text-primary-text capitalize">{config.type}</span>
          <span className="text-xs text-text-muted">No additional configuration needed.</span>
        </div>
      );
  }
}
