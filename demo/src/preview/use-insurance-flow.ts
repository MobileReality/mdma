import { useEffect, useRef } from 'react';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import {
  insuranceBackend,
  type BankPayload,
  type ClaimPayload,
  type PersonalInfoPayload,
} from './insurance-backend.js';

interface UseInsuranceFlowOptions {
  /**
   * The store currently rendered in the preview pane (validated/fixed
   * output, NOT the agent's raw block.store). When the user clicks Submit
   * in the right pane, the ACTION_TRIGGERED event fires on this store, so
   * the hook must subscribe to *this* store — earlier versions subscribed
   * to block.store and silently missed every submit.
   */
  currentStore: DocumentStore | null;
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
 * 1. Subscribes to `ACTION_TRIGGERED` on whatever store is currently being
 *    rendered in the preview pane.
 * 2. When a known `actionId` fires, pulls the submitted values from that
 *    same store, calls the mock backend, and waits for success.
 * 3. On success, sends a HIDDEN user message to the agent — no form data,
 *    just a "step N done, please continue" signal.
 *
 * The claim id from step 1 is threaded into steps 2 + 3 via a ref.
 */
export function useInsuranceFlow({
  currentStore,
  sendHidden,
  isGenerating,
}: UseInsuranceFlowOptions) {
  const subscribedStores = useRef(new WeakSet<DocumentStore>());
  const handledActions = useRef(new Set<string>());
  const claimIdRef = useRef<string | null>(null);
  const isGeneratingRef = useRef(isGenerating);
  isGeneratingRef.current = isGenerating;
  const sendHiddenRef = useRef(sendHidden);
  sendHiddenRef.current = sendHidden;

  useEffect(() => {
    if (!currentStore || subscribedStores.current.has(currentStore)) return;
    subscribedStores.current.add(currentStore);

    currentStore.getEventBus().on('ACTION_TRIGGERED', (action) => {
      if (isGeneratingRef.current) return;
      const { actionId, componentId } = action;
      if (!isHandledActionId(actionId)) return;

      const key = `${componentId}:${actionId}`;
      if (handledActions.current.has(key)) return;
      handledActions.current.add(key);

      const values = (currentStore.getComponentState(componentId)?.values ?? {}) as Record<
        string,
        unknown
      >;
      void dispatch(actionId, values).catch((err) => {
        handledActions.current.delete(key);
        console.error('[insurance-flow] backend call failed', err);
      });
    });
  }, [currentStore]);

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
}
