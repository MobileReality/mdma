# Creating Custom Attachable Handlers

Attachable handlers define how MDMA component types initialize, process actions, and respond to state changes. MDMA ships with 7 built-in interactive handlers (plus display-only renderers for chart and thinking), but you can create custom ones for domain-specific needs.

## Overview

An attachable handler implements the `AttachableHandler` interface from `@mobile-reality/mdma-runtime`:

```typescript
interface AttachableHandler<TProps = unknown> {
  definition: AttachableDefinition<TProps>;
  initialize?: (ctx: AttachableContext, props: TProps) => ComponentState;
  onAction?: (ctx: AttachableContext, actionId: string, payload: unknown) => Promise<void> | void;
  onStateChange?: (ctx: AttachableContext, newState: ComponentState) => void;
}
```

Where `AttachableDefinition` declares metadata:

```typescript
interface AttachableDefinition<TProps = unknown> {
  type: string;       // Component type name used in MDMA blocks
  schema: ZodType;    // Zod schema for validation
  description: string;
  version: string;
}
```

## Handler Directory Structure

A custom handler lives in its own directory with a `package.json`:

```
my-component/
  handler.ts
  package.json
```

## Step-by-Step: Building a Timer Component

Let's build a countdown timer component that starts when triggered and fires an action when it expires.

### 1. Define the Schema

Create the Zod schema by extending `ComponentBaseSchema`:

```typescript
// timer/schema.ts
import { z } from 'zod';
import { ComponentBaseSchema } from '@mobile-reality/mdma-spec';

export const TimerComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('timer'),
  durationSeconds: z.number().int().positive(),
  onExpire: z.string().optional().describe('Action ID triggered when timer reaches zero'),
  autoStart: z.boolean().default(false),
});

export type TimerComponent = z.infer<typeof TimerComponentSchema>;
```

### 2. Implement the Handler

```typescript
// timer/timer-handler.ts
import { TimerComponentSchema } from './schema.js';
import type {
  AttachableHandler,
  ComponentState,
  AttachableContext,
} from '@mobile-reality/mdma-runtime';

export const timerHandler: AttachableHandler = {
  definition: {
    type: 'timer',
    schema: TimerComponentSchema,
    description: 'Countdown timer that triggers an action on expiry',
    version: '0.1.0',
  },

  initialize(_ctx: AttachableContext, props: unknown): ComponentState {
    const timer = TimerComponentSchema.parse(props);
    return {
      id: timer.id,
      type: 'timer',
      values: {
        remaining: timer.durationSeconds,
        status: timer.autoStart ? 'running' : 'idle',
      },
      errors: [],
      touched: false,
      visible: true,
      disabled: false,
    };
  },

  async onAction(ctx: AttachableContext, actionId: string) {
    switch (actionId) {
      case 'start':
        ctx.dispatch({
          type: 'ACTION_TRIGGERED',
          componentId: ctx.componentId,
          actionId: 'timer-started',
        });
        break;

      case 'expire':
        ctx.dispatch({
          type: 'ACTION_TRIGGERED',
          componentId: ctx.componentId,
          actionId: 'timer-expired',
        });
        break;

      case 'reset':
        ctx.dispatch({
          type: 'ACTION_TRIGGERED',
          componentId: ctx.componentId,
          actionId: 'timer-reset',
        });
        break;
    }
  },
};
```

### 3. Register the Handler

Register your handler alongside the core handlers:

```typescript
import { AttachableRegistry } from '@mobile-reality/mdma-runtime';
import { registerAllCoreAttachables } from '@mobile-reality/mdma-attachables-core';
import { timerHandler } from './timer/timer-handler.js';

const registry = new AttachableRegistry();
registerAllCoreAttachables(registry);
registry.register(timerHandler);

// Pass to document store
const store = createDocumentStore(ast, { registry });
```

### 4. Register the Schema for Parsing

To validate your custom component during parsing, pass the schema to the remark plugin:

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { TimerComponentSchema } from './timer/schema.js';

const customSchemas = new Map([
  ['timer', TimerComponentSchema],
]);

const processor = unified()
  .use(remarkParse)
  .use(remarkMdma, { customSchemas });
```

### 5. Use in a Document

Now you can use the custom component in MDMA documents:

```mdma
id: sla-timer
type: timer
durationSeconds: 900
autoStart: true
onExpire: escalate-ticket
```

## Handler Lifecycle

1. **Parse time** -- The parser validates the YAML block against the schema (from `componentSchemaRegistry` or `customSchemas`). Invalid blocks produce lint errors.

2. **Store initialization** -- When `createDocumentStore` processes the AST, it calls `handler.initialize(ctx, props)` for each component to create the initial `ComponentState`.

3. **Action dispatch** -- When `store.dispatch()` is called with an action targeting this component, the handler's `onAction` method is invoked.

4. **State change** -- When the component's state changes (from any action), `onStateChange` is called if implemented.

## The AttachableContext

The `ctx` object passed to handler methods provides:

```typescript
interface AttachableContext {
  componentId: string;
  dispatch: (action: StoreAction) => void;
  getState: () => Record<string, unknown>;
  resolveBinding: (expr: string) => unknown;
  policy: { enforce: (action: string) => void };
}
```

- `dispatch` -- send actions to the document store
- `getState` -- read the current binding state
- `resolveBinding` -- resolve a `{{binding.expression}}`
- `policy.enforce` -- check policy before performing side effects (throws `PolicyViolationError` if denied)

## Policy Enforcement

Handlers that perform side effects (HTTP calls, email sends) should enforce policy before executing:

```typescript
async onAction(ctx: AttachableContext, actionId: string) {
  if (actionId === 'execute') {
    // This throws PolicyViolationError in preview/test environments
    ctx.policy.enforce('webhook_call');

    // Proceed with the actual call...
    ctx.dispatch({
      type: 'INTEGRATION_CALLED',
      componentId: ctx.componentId,
      integrationId: 'timer',
      result: { status: 'completed' },
    });
  }
}
```

## Testing Handlers

Test handlers in isolation using Vitest:

```typescript
import { describe, it, expect } from 'vitest';
import { timerHandler } from './timer-handler.js';

describe('timerHandler', () => {
  it('initializes with correct default state', () => {
    const ctx = {
      componentId: 'test-timer',
      dispatch: () => {},
      getState: () => ({}),
      resolveBinding: () => undefined,
      policy: { enforce: () => {} },
    };

    const state = timerHandler.initialize!(ctx, {
      id: 'test-timer',
      type: 'timer',
      durationSeconds: 60,
      autoStart: false,
    });

    expect(state.id).toBe('test-timer');
    expect(state.values.remaining).toBe(60);
    expect(state.values.status).toBe('idle');
  });
});
```

## Adding a React Renderer

If using `@mobile-reality/mdma-renderer-react`, register a renderer component for your type:

```tsx
import type { MdmaBlockRendererProps } from '@mobile-reality/mdma-renderer-react';

function TimerRenderer({ component, componentState, dispatch }: MdmaBlockRendererProps) {
  const remaining = componentState?.values.remaining as number;

  return (
    <div>
      <h3>{component.label ?? 'Timer'}</h3>
      <p>Remaining: {remaining}s</p>
      <button onClick={() => dispatch({
        type: 'ACTION_TRIGGERED',
        componentId: component.id,
        actionId: 'start',
      })}>
        Start
      </button>
    </div>
  );
}

// Register with the renderer registry
import { RendererRegistry } from '@mobile-reality/mdma-renderer-react';
const renderers = new RendererRegistry();
renderers.register('timer', TimerRenderer);
```
