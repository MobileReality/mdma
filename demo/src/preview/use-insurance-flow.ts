import { useEffect, useRef } from 'react';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import type { AgentDisplayTurn, AssistantTurn } from '../agent/types.js';
import {
  insuranceBackend,
  type BankPayload,
  type ClaimPayload,
  type PersonalInfoPayload,
} from './insurance-backend.js';

interface UseInsuranceFlowOptions {
  turns: AgentDisplayTurn[];
  sendHidden: (message: string) => Promise<void>;
  isGenerating: boolean;
}

const ACTION_IDS = ['collect-personal-info', 'collect-claim', 'collect-bank'] as const;
type ActionId = (typeof ACTION_IDS)[number];

function isHandledActionId(id: string): id is ActionId {
  return (ACTION_IDS as readonly string[]).includes(id);
}

/**
 * Drives the Insurance Preview flow:
 *
 * 1. Listens for `ACTION_TRIGGERED` events on the MDMA renderer stores of
 *    each new assistant turn.
 * 2. When an event with one of our known `actionId`s fires, pulls the
 *    submitted values straight from the store (does NOT include them in
 *    any message to the agent), calls the mock backend, and waits for the
 *    success response.
 * 3. On success, sends a HIDDEN user message to the agent — never shown
 *    in the chat — carrying only a "step N complete, please continue"
 *    signal. The agent uses that to emit the next step naturally.
 *
 * The claim id returned by step 1 is threaded into steps 2 + 3 via a ref
 * so consecutive backend calls reference the same claim.
 */
export function useInsuranceFlow({ turns, sendHidden, isGenerating }: UseInsuranceFlowOptions) {
  const subscribedStores = useRef(new Set<DocumentStore>());
  const handledActions = useRef(new Set<string>());
  const claimIdRef = useRef<string | null>(null);
  const isGeneratingRef = useRef(isGenerating);
  isGeneratingRef.current = isGenerating;
  const sendHiddenRef = useRef(sendHidden);
  sendHiddenRef.current = sendHidden;

  useEffect(() => {
    for (const turn of turns) {
      if (turn.role !== 'assistant') continue;
      const blocks = (turn as AssistantTurn).blocks;
      for (const block of blocks) {
        if (block.type !== 'tool_use') continue;
        const store = block.store;
        if (!store || subscribedStores.current.has(store)) continue;
        subscribedStores.current.add(store);

        store.getEventBus().on('ACTION_TRIGGERED', (action) => {
          if (isGeneratingRef.current) return;
          const { actionId, componentId } = action;
          if (!isHandledActionId(actionId)) return;

          // De-dupe: one ACTION_TRIGGERED per (componentId, actionId)
          const key = `${componentId}:${actionId}`;
          if (handledActions.current.has(key)) return;
          handledActions.current.add(key);

          const values = (store.getComponentState(componentId)?.values ?? {}) as Record<
            string,
            unknown
          >;
          void dispatch(actionId, values).catch((err) => {
            handledActions.current.delete(key);
            // Surfacing errors to the user is out of scope for now; log and
            // let them retry the submission.
            console.error('[insurance-flow] backend call failed', err);
          });
        });
      }
    }
  }, [turns]);

  async function dispatch(actionId: ActionId, values: Record<string, unknown>) {
    if (actionId === 'collect-personal-info') {
      const payload: PersonalInfoPayload = {
        'full-name': String(values['full-name'] ?? ''),
        birthday: String(values.birthday ?? ''),
      };
      const result = await insuranceBackend.collectPersonalInfo(payload);
      claimIdRef.current = result.claimId;
      await sendHiddenRef.current(
        `[system] The user submitted the personal-info form and the backend accepted it (claim id: ${result.claimId}). Proceed to step 2 by emitting the claim description form.`,
      );
      return;
    }

    if (actionId === 'collect-claim') {
      const claimId = claimIdRef.current;
      if (!claimId) {
        console.warn('[insurance-flow] collect-claim fired before claim id was available');
        return;
      }
      const payload: ClaimPayload = {
        'claim-description': String(values['claim-description'] ?? ''),
      };
      await insuranceBackend.collectClaim(claimId, payload);
      await sendHiddenRef.current(
        `[system] The user submitted the claim description and the backend accepted it (claim id: ${claimId}). Proceed to step 3 by emitting the bank-account form.`,
      );
      return;
    }

    if (actionId === 'collect-bank') {
      const claimId = claimIdRef.current;
      if (!claimId) {
        console.warn('[insurance-flow] collect-bank fired before claim id was available');
        return;
      }
      const payload: BankPayload = { iban: String(values.iban ?? '') };
      const result = await insuranceBackend.collectBank(claimId, payload);
      await sendHiddenRef.current(
        `[system] The user submitted the bank-account form and the backend accepted it (claim id: ${claimId}, funds ETA: ${result.etaDays} business days). Proceed to step 4 by emitting the final success callout.`,
      );
      return;
    }
  }

  // Reset internal state when the chat is cleared (turns goes from N to 0).
  const prevTurnCount = useRef(turns.length);
  useEffect(() => {
    if (prevTurnCount.current > 0 && turns.length === 0) {
      subscribedStores.current.clear();
      handledActions.current.clear();
      claimIdRef.current = null;
    }
    prevTurnCount.current = turns.length;
  }, [turns.length]);
}
