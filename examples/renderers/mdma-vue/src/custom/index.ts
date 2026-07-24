import { defineAsyncComponent } from 'vue';
import type { MdmaRenderCustomizations } from '@mobile-reality/mdma-renderer-vue';
import { ChartRenderer } from './ChartRenderer';
import { GRAPH_3D_CATALOG_ENTRY } from './graph3d-catalog';

export { GRAPH_3D_CATALOG_ENTRY };

// three.js is ~500 kB, and most conversations never render a 3D graph — so load
// the renderer (and three) on demand, only when a `graph-3d` block first appears.
const Graph3D = defineAsyncComponent(() => import('./Graph3D').then((m) => m.Graph3D));

/**
 * Host customizations passed to every `MdmaDocument`:
 * - `components.chart` overrides the built-in chart with a real 2D SVG chart.
 * - `customVariants['graph-3d']` supplies the renderer for the `graph-3d`
 *   custom component the model is told about in the system prompt.
 */
export const CUSTOMIZATIONS: MdmaRenderCustomizations = {
  components: {
    chart: ChartRenderer,
  },
  customVariants: {
    'graph-3d': Graph3D,
  },
};
