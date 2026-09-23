import { type PolicyEngine, PolicyViolationError } from '@mobile-reality/mdma-runtime';
import type { RunActionRequest, RunActionResult } from '@shared/ipc';
import type { AuditTrail } from './audit.js';

interface ActionHandler {
  /** Policy action gated before running, if any (see `createDefaultPolicy`). */
  policyAction?: string;
  run(request: RunActionRequest): Promise<unknown>;
}

export interface ActionHost {
  run(request: RunActionRequest): Promise<RunActionResult>;
}

const INTERNAL_API_URL = process.env.INTERNAL_API_URL;
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

const handlers: Record<string, ActionHandler> = {
  'submit-intake': {
    async run({ payload }) {
      return { accepted: true, receivedFields: Object.keys((payload ?? {}) as object).length };
    },
  },
  'notify-backend': {
    policyAction: 'webhook_call',
    async run({ componentId, payload }) {
      if (!INTERNAL_API_URL) {
        return { simulated: true, reason: 'INTERNAL_API_URL is not set' };
      }
      const response = await fetch(INTERNAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(INTERNAL_API_TOKEN ? { Authorization: `Bearer ${INTERNAL_API_TOKEN}` } : {}),
        },
        body: JSON.stringify({ componentId, payload }),
      });
      if (!response.ok) throw new Error(`Backend responded ${response.status}`);
      return await response.json();
    },
  },
};

/**
 * Runs the actions a component triggers, in the main process. Two things are
 * only true because it lives here: the policy check cannot be skipped by the
 * page, and outbound calls carry credentials the renderer never receives.
 */
export function createActionHost(policy: PolicyEngine, audit: AuditTrail): ActionHost {
  return {
    async run(request) {
      const handler = handlers[request.actionId];
      if (!handler) {
        return { ok: false, error: `Unknown action "${request.actionId}"`, deniedByPolicy: false };
      }

      try {
        if (handler.policyAction) policy.enforce(handler.policyAction);
        const result = await handler.run(request);
        audit.append([
          {
            eventType: 'integration_called',
            componentId: request.componentId,
            payload: { integrationId: request.actionId, result },
            redacted: false,
          },
        ]);
        return { ok: true, result };
      } catch (error) {
        const deniedByPolicy = error instanceof PolicyViolationError;
        const message = error instanceof Error ? error.message : String(error);
        audit.append([
          {
            eventType: 'integration_called',
            componentId: request.componentId,
            payload: { integrationId: request.actionId, error: message, deniedByPolicy },
            redacted: false,
          },
        ]);
        return { ok: false, error: message, deniedByPolicy };
      }
    },
  };
}
