import { ApprovalGateRenderer } from '../components/ApprovalGateRenderer.js';
import { ButtonRenderer } from '../components/ButtonRenderer.js';
import { CalloutRenderer } from '../components/CalloutRenderer.js';
import { ChartRenderer } from '../components/ChartRenderer.js';
import { CustomRenderer } from '../components/CustomRenderer.js';
import { FormRenderer } from '../components/FormRenderer.js';
import { TableRenderer } from '../components/TableRenderer.js';
import { TasklistRenderer } from '../components/TasklistRenderer.js';
import { ThinkingRenderer } from '../components/ThinkingRenderer.js';
import { WebhookRenderer } from '../components/WebhookRenderer.js';
import type { MdmaBlockRenderer } from './renderer-props.js';

export class RendererRegistry {
  private renderers = new Map<string, MdmaBlockRenderer>();

  register(type: string, renderer: MdmaBlockRenderer): void {
    this.renderers.set(type, renderer);
  }

  get(type: string): MdmaBlockRenderer | undefined {
    return this.renderers.get(type);
  }

  has(type: string): boolean {
    return this.renderers.has(type);
  }

  /** Convert to a plain record for passing as the `renderers` option. */
  toRecord(): Record<string, MdmaBlockRenderer> {
    return Object.fromEntries(this.renderers);
  }
}

/** Built-in renderers for all core MDMA component types. */
export const defaultRenderers: Record<string, MdmaBlockRenderer> = {
  form: FormRenderer,
  button: ButtonRenderer,
  tasklist: TasklistRenderer,
  table: TableRenderer,
  callout: CalloutRenderer,
  'approval-gate': ApprovalGateRenderer,
  webhook: WebhookRenderer,
  chart: ChartRenderer,
  thinking: ThinkingRenderer,
  custom: CustomRenderer,
};

/** A registry pre-populated with the built-ins; register more to extend or override. */
export function createRendererRegistry(): RendererRegistry {
  const registry = new RendererRegistry();
  for (const [type, renderer] of Object.entries(defaultRenderers)) {
    registry.register(type, renderer);
  }
  return registry;
}
