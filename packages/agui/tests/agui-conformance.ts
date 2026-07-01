/**
 * Compile-time conformance guard — **type-only, never executed**. This file is checked by
 * `pnpm typecheck` (via `tsconfig.typecheck.json`) against the installed `@ag-ui/*` packages,
 * and is excluded from the published build. If AG-UI's API drifts such that our narrow types in
 * `../src/types.ts` no longer line up with the real ones, one of the assignments below stops
 * compiling and `typecheck` fails — turning silent runtime drift into a build error.
 */
import type { AbstractAgent, AgentSubscriber } from '@ag-ui/client';
import type { Message } from '@ag-ui/core';
import type { AguiAgent, AguiMessage, AguiSubscriber } from '../src/types.js';

// A real AbstractAgent must be usable wherever the bridge expects an AguiAgent. This also
// verifies (via addMessage's param) that our AguiMessage is a valid input to the real agent.
const _agent: AguiAgent = null as unknown as AbstractAgent;

// Our subscriber object must be acceptable to the real `agent.subscribe(...)`.
const _subscriber: AgentSubscriber = null as unknown as AguiSubscriber;

// The user message the bridge builds must be a valid AG-UI `Message`.
const _message: Message = null as unknown as AguiMessage;

export type _Conformance = [typeof _agent, typeof _subscriber, typeof _message];
