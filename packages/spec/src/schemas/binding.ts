import { z } from 'zod';

export const BindingExpressionSchema = z
  .string()
  .regex(/^\{\{.+\}\}$/s, 'Binding must be wrapped in {{ }}');

export type BindingExpression = z.infer<typeof BindingExpressionSchema>;

/** Schema for values that can be either a literal or a binding expression */
export function bindable<T extends z.ZodType>(schema: T) {
  return z.union([schema, BindingExpressionSchema]);
}
