# Writing a Custom Attachable Handler

This guide shows how to create and register a custom MDMA component handler.

## Overview

An **attachable handler** tells the MDMA runtime how to initialize, manage state, and respond to actions for a component type. The built-in handlers live in `@mobile-reality/mdma-attachables-core`, but you can add your own.

## Step 1 -- Define a Schema

Create a Zod schema that extends `ComponentBaseSchema`:

```typescript
// schemas/rating.ts
import { z } from 'zod';
import { ComponentBaseSchema } from '@mobile-reality/mdma-spec';

export const RatingComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('rating'),
  maxStars: z.number().int().positive().default(5),
  label: z.string().optional(),
  onRate: z.string().optional().describe('Action ID triggered when the user rates'),
});

export type RatingComponent = z.infer<typeof RatingComponentSchema>;
```

## Step 2 -- Implement the Handler

Create a handler that satisfies the `AttachableHandler` interface from `@mobile-reality/mdma-runtime`:

```typescript
// handlers/rating-handler.ts
import type { AttachableHandler, ComponentState, AttachableContext } from '@mobile-reality/mdma-runtime';
import { RatingComponentSchema } from '../schemas/rating.js';

export const ratingHandler: AttachableHandler = {
  // Definition used for registration and introspection
  definition: {
    type: 'rating',
    schema: RatingComponentSchema,
    description: 'Star rating input',
    version: '0.1.0',
  },

  // Called once when the component is first encountered
  initialize(_ctx: AttachableContext, props: unknown): ComponentState {
    const parsed = RatingComponentSchema.parse(props);
    return {
      id: parsed.id,
      type: 'rating',
      values: { stars: 0 },
      errors: [],
      touched: false,
      visible: true,
      disabled: false,
    };
  },

  // Called when the user performs an action (e.g., clicks a star)
  async onAction(ctx: AttachableContext, actionId: string, payload: unknown) {
    const { stars } = payload as { stars: number };
    ctx.dispatch({
      type: 'ACTION_TRIGGERED',
      componentId: ctx.componentId,
      actionId,
      payload: { stars },
    });
  },

  // Called whenever component state changes (optional)
  onStateChange(_ctx: AttachableContext, newState: ComponentState) {
    // React to state changes, e.g., enable/disable dependent components
    console.log(`Rating ${newState.id} updated:`, newState.values);
  },
};
```

## Step 3 -- Register the Handler

Use the `AttachableRegistry` to register your handler before the runtime processes any documents:

```typescript
// setup.ts
import { AttachableRegistry } from '@mobile-reality/mdma-runtime';
import { registerAllCoreAttachables } from '@mobile-reality/mdma-attachables-core';
import { ratingHandler } from './handlers/rating-handler.js';

const registry = new AttachableRegistry();

// Register all built-in handlers
registerAllCoreAttachables(registry);

// Register your custom handler
registry.register(ratingHandler);

// Verify registration
console.log(`Registered ${registry.size} handlers`);
console.log('Has rating:', registry.has('rating')); // true
```

## Step 4 -- Use It in a Document

Once registered, you can use your component in any MDMA document:

```mdma
id: user-rating
type: rating
maxStars: 5
label: How would you rate this experience?
onRate: submit-rating
```

## Handler Interface Reference

```typescript
interface AttachableHandler<TProps = unknown> {
  definition: AttachableDefinition<TProps>;
  initialize?: (ctx: AttachableContext, props: TProps) => ComponentState;
  onAction?: (ctx: AttachableContext, actionId: string, payload: unknown) => Promise<void> | void;
  onStateChange?: (ctx: AttachableContext, newState: ComponentState) => void;
}
```

| Method | When it runs | Required |
|--------|-------------|----------|
| `initialize` | Component first appears in the document | No (but recommended) |
| `onAction` | User triggers an action (click, submit, etc.) | No |
| `onStateChange` | Component state is updated | No |

## Tips

- Always validate props with your Zod schema inside `initialize` to get clear error messages early.
- Use `ctx.dispatch()` to emit events that other components or the policy engine can react to.
- Use `ctx.resolveBinding()` to read values from other components via binding expressions.
- Mark fields as `sensitive: true` in your schema if they contain PII -- the runtime redactor will handle them automatically.
