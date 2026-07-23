import {
  computed,
  defineComponent,
  inject,
  provide,
  type Component,
  type ComputedRef,
  type InjectionKey,
  type PropType,
} from 'vue';

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

/**
 * Props for the marker rendered next to a sensitive (PII) field's label.
 * Override the `sensitiveIndicator` element to restyle the badge — or render
 * nothing to opt out of it entirely for a given scope.
 */
export interface FormSensitiveIndicatorElementProps {
  /** Machine name of the field this indicator marks. */
  name: string;
  /** Display label of the field this indicator marks. */
  label: string;
}

// ─── Element overrides map ───────────────────────────────────────────────────

/**
 * Scoped element overrides. Keys are scope names (`'*'` for global,
 * `'form'` for form-only, etc.). Values map element type names to
 * Vue components.
 *
 * Resolution order: scope-specific → `'*'` (global) → built-in default.
 *
 * @example
 * ```ts
 * const overrides: ElementOverrides = {
 *   '*': { input: GlassInput },                          // global fallback
 *   form: {
 *     checkbox: ToggleSwitch,                            // only inside forms
 *     sensitiveIndicator: () => null,                    // opt out of the PII badge
 *   },
 * };
 * ```
 */
export type ElementOverrides = Record<string, Record<string, Component>>;

// ─── Context ─────────────────────────────────────────────────────────────────

export const ElementOverridesKey: InjectionKey<ComputedRef<ElementOverrides | null>> =
  Symbol('mdma-element-overrides');

export type ElementOverridesProviderProps = {
  value?: ElementOverrides;
};

export const ElementOverridesProvider = defineComponent({
  name: 'ElementOverridesProvider',
  props: {
    value: { type: Object as PropType<ElementOverrides>, default: undefined },
  },
  setup(props, { slots }) {
    provide(
      ElementOverridesKey,
      computed(() => props.value ?? null),
    );
    return () => slots.default?.();
  },
});

/**
 * Resolve an element override for the given scope and element type.
 *
 * Fallback chain: `overrides[scope][elementType]` → `overrides['*'][elementType]` → `undefined`.
 *
 * Returns a `ComputedRef` so a renderer resolving overrides once in `setup` still
 * picks up a later change to the document's `customizations`.
 */
export function useElementOverride(
  scope: string,
  elementType: string,
): ComputedRef<Component | undefined> {
  const overrides = inject(
    ElementOverridesKey,
    computed(() => null),
  );
  return computed(() => {
    const map = overrides.value;
    if (!map) return undefined;
    return map[scope]?.[elementType] ?? map['*']?.[elementType];
  });
}
