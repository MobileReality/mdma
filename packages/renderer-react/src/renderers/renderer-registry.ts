import type { ComponentType } from 'react';
import type { MdmaComponent, StoreAction } from '@mdma/spec';
import type { ComponentState } from '@mdma/runtime';

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
}
