import { z } from 'zod';

export const BindingExpressionSchema = z
  .string()
  .regex(
    /^\{\{[a-zA-Z_][a-zA-Z0-9_.]*\}\}$/,
    'Binding must be in {{variable.path}} format',
  );

export type BindingExpression = z.infer<typeof BindingExpressionSchema>;

/** Schema for values that can be either a literal or a binding expression */
export function bindable<T extends z.ZodType>(schema: T) {
  return z.union([schema, BindingExpressionSchema]);
}
