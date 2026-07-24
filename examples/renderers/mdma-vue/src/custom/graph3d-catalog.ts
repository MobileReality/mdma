import type { CustomComponentPromptEntry } from '@mobile-reality/mdma-prompt-pack';

/**
 * Catalog entry advertised to the model via
 * `buildSystemPrompt({ customComponents })`. Without this the agent cannot
 * author a `graph-3d` block at all — the author prompt forbids inventing a
 * `name` that isn't in the "Available Custom Components" list.
 *
 * Kept in its own module (no three.js import) so the system prompt can reference
 * it without pulling the WebGL renderer into the main bundle.
 */
export const GRAPH_3D_CATALOG_ENTRY: CustomComponentPromptEntry = {
  name: 'graph-3d',
  description:
    'Render an interactive 3D bar chart (WebGL) from tabular data — two categorical axes plus a numeric height. Use for comparing a metric across two dimensions at once, e.g. revenue by region and quarter. Bars are clickable: ALWAYS wire `actions.onSelect` to an action label so a click on a bar is actionable.',
  props:
    'data: string (CSV block — header row then rows), x: string (column for the X axis, categorical), z: string (column for the Z axis, categorical), y: string (column for bar height, numeric), title: string (optional), autoRotate: boolean (optional)',
  actions: ['onSelect'],
};
