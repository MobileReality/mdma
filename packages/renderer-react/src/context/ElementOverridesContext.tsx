import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from 'react';

// ─── Element prop interfaces ─────────────────────────────────────────────────

export interface FormInputElementProps {
  id: string;
  name: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** When true, the field contains PII and should be visually marked / masked. */
  sensitive?: boolean;
}

export interface FormSelectElementProps extends FormInputElementProps {
  options: { label: string; value: string }[];
}

export interface FormCheckboxElementProps {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** When true, the field contains PII and should be visually marked / masked. */
  sensitive?: boolean;
}

export interface FormTextareaElementProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** When true, the field contains PII and should be visually marked / masked. */
  sensitive?: boolean;
}

export interface FormFileElementProps {
  id: string;
  name: string;
  label: string;
  /** Files currently selected for this field. */
  value: File[];
  onChange: (files: File[]) => void;
  required?: boolean;
  /** When true, the field contains PII and should be visually marked / masked. */
  sensitive?: boolean;
}

export interface FormSubmitElementProps {
  onClick: () => void;
  label: string;
}

// ─── Element overrides map ───────────────────────────────────────────────────

/**
 * Scoped element overrides. Keys are scope names (`'*'` for global,
 * `'form'` for form-only, etc.). Values map element type names to
 * React components.
 *
 * Resolution order: scope-specific → `'*'` (global) → built-in default.
 *
 * @example
 * ```ts
 * const overrides: ElementOverrides = {
 *   '*': { input: GlassInput },            // global fallback
 *   form: { checkbox: ToggleSwitch },       // only inside forms
 * };
 * ```
 */
export type ElementOverrides = Record<string, Record<string, ComponentType<any>>>;

// ─── Context ─────────────────────────────────────────────────────────────────

const ElementOverridesContext = createContext<ElementOverrides | null>(null);

export interface ElementOverridesProviderProps {
  value?: ElementOverrides;
  children: ReactNode;
}

export function ElementOverridesProvider({ value, children }: ElementOverridesProviderProps) {
  const stable = useMemo(() => value ?? null, [value]);
  return (
    <ElementOverridesContext.Provider value={stable}>{children}</ElementOverridesContext.Provider>
  );
}

/**
 * Resolve an element override for the given scope and element type.
 *
 * Fallback chain: `overrides[scope][elementType]` → `overrides['*'][elementType]` → `undefined`.
 */
export function useElementOverride<P = unknown>(
  scope: string,
  elementType: string,
): ComponentType<P> | undefined {
  const overrides = useContext(ElementOverridesContext);
  if (!overrides) return undefined;
  return (overrides[scope]?.[elementType] ?? overrides['*']?.[elementType]) as
    | ComponentType<P>
    | undefined;
}
