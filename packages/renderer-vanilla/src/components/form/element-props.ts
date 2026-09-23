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
  sensitive?: boolean;
}

export interface FormTextareaElementProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
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
  sensitive?: boolean;
}

export interface FormSubmitElementProps {
  onClick: () => void;
  label: string;
}

/**
 * Props for the marker rendered next to a sensitive (PII) field's label.
 * Override the `sensitiveIndicator` element to restyle the badge — or render
 * an empty element to opt out of it for a given scope.
 */
export interface FormSensitiveIndicatorElementProps {
  name: string;
  label: string;
}
