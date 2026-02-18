import type { ComponentType } from 'react';
import type { MdmaComponent, StoreAction } from '@mdma/spec';
import type { ComponentState } from '@mdma/runtime';
import { FormRenderer } from '../components/FormRenderer.js';
import { ButtonRenderer } from '../components/ButtonRenderer.js';
import { TasklistRenderer } from '../components/TasklistRenderer.js';
import { TableRenderer } from '../components/TableRenderer.js';
import { CalloutRenderer } from '../components/CalloutRenderer.js';
import { ApprovalGateRenderer } from '../components/ApprovalGateRenderer.js';
import { WebhookRenderer } from '../components/WebhookRenderer.js';
import { ChartRenderer } from '../components/ChartRenderer.js';

export interface MdmaBlockRendererProps {
  component: MdmaComponent;
  componentState: ComponentState | undefined;
  dispatch: (action: StoreAction) => void;
  resolveBinding: (expr: string) => unknown;
}

export class RendererRegistry {
  private renderers = new Map<string, ComponentType<MdmaBlockRendererProps>>();

  register(type: string, renderer: ComponentType<MdmaBlockRendererProps>): void {
    this.renderers.set(type, renderer);
  }

  get(type: string): ComponentType<MdmaBlockRendererProps> | undefined {
    return this.renderers.get(type);
  }

  has(type: string): boolean {
    return this.renderers.has(type);
  }

  /** Convert to a plain record for passing as the `renderers` prop. */
  toRecord(): Record<string, ComponentType<MdmaBlockRendererProps>> {
    return Object.fromEntries(this.renderers);
  }
}

/** Built-in renderers for all core MDMA component types. */
export const defaultRenderers: Record<string, ComponentType<MdmaBlockRendererProps>> = {
  form: FormRenderer,
  button: ButtonRenderer,
  tasklist: TasklistRenderer,
  table: TableRenderer,
  callout: CalloutRenderer,
  'approval-gate': ApprovalGateRenderer,
  webhook: WebhookRenderer,
  chart: ChartRenderer,
};

/**
 * Create a new RendererRegistry pre-populated with all built-in renderers.
 * Register additional renderers to extend or override defaults.
 */
export function createRendererRegistry(): RendererRegistry {
  const registry = new RendererRegistry();
  for (const [type, renderer] of Object.entries(defaultRenderers)) {
    registry.register(type, renderer);
  }
  return registry;
}
