import type { MdmaBlock as MdmaBlockType } from '@mdma/spec';
import { useDocumentStore, useComponentState } from '../hooks/use-document-store.js';
import { FormRenderer } from './FormRenderer.js';
import { ButtonRenderer } from './ButtonRenderer.js';
import { TasklistRenderer } from './TasklistRenderer.js';
import { TableRenderer } from './TableRenderer.js';
import { CalloutRenderer } from './CalloutRenderer.js';
import { ApprovalGateRenderer } from './ApprovalGateRenderer.js';
import { WebhookRenderer } from './WebhookRenderer.js';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import type { ComponentType } from 'react';

const defaultRenderers: Record<string, ComponentType<MdmaBlockRendererProps>> = {
  form: FormRenderer,
  button: ButtonRenderer,
  tasklist: TasklistRenderer,
  table: TableRenderer,
  callout: CalloutRenderer,
  'approval-gate': ApprovalGateRenderer,
  webhook: WebhookRenderer,
};

export interface MdmaBlockProps {
  block: MdmaBlockType;
  renderers?: Record<string, ComponentType<MdmaBlockRendererProps>>;
}

export function MdmaBlock({ block, renderers }: MdmaBlockProps) {
  const store = useDocumentStore();
  const componentState = useComponentState(block.component.id);

  const Renderer =
    renderers?.[block.component.type] ?? defaultRenderers[block.component.type];

  if (!Renderer) {
    return (
      <div className="mdma-unknown-component">
        Unknown component type: {block.component.type}
      </div>
    );
  }

  return (
    <Renderer
      component={block.component}
      componentState={componentState}
      dispatch={(action) => store.dispatch(action)}
      resolveBinding={(expr) => store.resolveBinding(expr)}
    />
  );
}
