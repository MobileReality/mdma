import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';
import { BindingExpressionSchema } from '../binding.js';

export const ChartComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('chart'),
  variant: z.enum(['line', 'bar', 'area', 'pie']).default('line'),
  data: z.union([z.string(), BindingExpressionSchema]),
  xAxis: z.string().optional(),
  yAxis: z.union([z.string(), z.array(z.string())]).optional(),
  colors: z.array(z.string()).optional(),
  showLegend: z.boolean().default(true),
  showGrid: z.boolean().default(true),
  height: z.number().default(300),
  stacked: z.boolean().default(false),
});

export type ChartComponent = z.infer<typeof ChartComponentSchema>;
