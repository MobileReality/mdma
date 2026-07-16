import type { AttachableDefinition } from '@mobile-reality/mdma-spec';
import type { AttachableHandler, AttachableRegistry } from './registry.js';

/** The Zod schema type carried by an attachable definition (avoids a direct zod dep here). */
type AttachableSchema = AttachableDefinition['schema'];

/**
 * A custom-component variant's framework-agnostic registration. The variant
 * `name` is `handler.definition.type`, and `handler.definition.schema` is the
 * variant's **props** schema (not the whole envelope — the `custom` envelope is
 * validated by core). Rendering is registered separately, per framework (e.g.
 * the React renderer's `customVariants`), because presentation is host-specific.
 */
export interface CustomComponentRegistration<TProps = unknown> {
  handler: AttachableHandler<TProps>;
}

/**
 * Registries a custom component is wired into. Both are optional so a host can
 * register only what it needs (e.g. schema-only for a presentational variant).
 */
export interface CustomRegistrationTargets {
  /** Runtime handler registry (behavior). */
  attachables?: AttachableRegistry;
  /** Parser `customSchemas` map — validates a `custom` component's `props` by `name`. */
  customSchemas?: Map<string, AttachableSchema>;
}

/**
 * Register a custom component's props schema (for parser validation) and its
 * runtime handler in one call, keyed by the variant `name`
 * (`handler.definition.type`).
 */
export function registerCustomComponent<TProps>(
  registration: CustomComponentRegistration<TProps>,
  targets: CustomRegistrationTargets,
): void {
  const { handler } = registration;
  const name = handler.definition.type;
  targets.attachables?.register(handler as AttachableHandler);
  targets.customSchemas?.set(name, handler.definition.schema);
}
