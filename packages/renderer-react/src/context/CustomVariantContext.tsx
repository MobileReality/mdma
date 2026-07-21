import { createContext, useContext, type ComponentType, type ReactNode } from 'react';
import type { CustomComponent, StoreAction } from '@mobile-reality/mdma-spec';
import type { ComponentState } from '@mobile-reality/mdma-runtime';

/**
 * Props passed to a custom-component variant renderer. The envelope is narrowed
 * to `custom`, and its `props` payload is surfaced directly for convenience.
 * Presentation lives entirely here — the spec only carries intent.
 */
export interface CustomVariantProps {
  component: CustomComponent;
  props: Record<string, unknown>;
  componentState: ComponentState | undefined;
  dispatch: (action: StoreAction) => void;
  resolveBinding: (expr: string) => unknown;
}

export type CustomVariantRenderer = ComponentType<CustomVariantProps>;

/** Map of custom-component `name` to the variant renderer that draws it. */
export type CustomVariants = Record<string, CustomVariantRenderer>;

const CustomVariantContext = createContext<CustomVariants>({});

export interface CustomVariantProviderProps {
  value?: CustomVariants;
  children: ReactNode;
}

export function CustomVariantProvider({ value, children }: CustomVariantProviderProps) {
  return (
    <CustomVariantContext.Provider value={value ?? {}}>{children}</CustomVariantContext.Provider>
  );
}

/** Read the registered custom variants. Call unconditionally, then look up by name. */
export function useCustomVariants(): CustomVariants {
  return useContext(CustomVariantContext);
}
