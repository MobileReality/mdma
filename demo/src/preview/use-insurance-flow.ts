import { useEffect, useRef } from 'react';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { insuranceBackend } from './insurance-backend.js';

interface UseInsuranceFlowOptions {
  currentStore: DocumentStore | null;
  sendHidden: (message: string) => Promise<void>;
  isGenerating: boolean;
}

type ActionId = 'collect-personal-info' | 'collect-claim' | 'collect-bank';

interface StepDispatcher {
  call: (
    values: Record<string, unknown>,
    claimId: string | null,
  ) => Promise<{ claimId?: string; message: string }>;
  requiresClaimId: boolean;
}

const STEPS: Record<ActionId, StepDispatcher> = {
  'collect-personal-info': {
    requiresClaimId: false,
    async call(values) {
      const result = await insuranceBackend.collectPersonalInfo({
        'full-name': String(values['full-name'] ?? ''),
        birthday: String(values.birthday ?? ''),
      });
      return {
        claimId: result.claimId,
        message: `[system] The user submitted the personal-info form and the backend accepted it (claim id: ${result.claimId}). Proceed to step 2 by emitting the claim description form.`,
      };
    },
  },
  'collect-claim': {
    requiresClaimId: true,
    async call(values, claimId) {
      await insuranceBackend.collectClaim(claimId!, {
        'claim-description': String(values['claim-description'] ?? ''),
      });
      return {
        message: `[system] The user submitted the claim description and the backend accepted it (claim id: ${claimId}). Proceed to step 3 by emitting the bank-account form.`,
      };
    },
  },
  'collect-bank': {
    requiresClaimId: true,
    async call(values, claimId) {
      const result = await insuranceBackend.collectBank(claimId!, {
        iban: String(values.iban ?? ''),
      });
      return {
        message: `[system] The user submitted the bank-account form and the backend accepted it (claim id: ${claimId}, funds ETA: ${result.etaDays} business days). Proceed to step 4 by emitting the final success callout.`,
      };
    },
  },
};

function isActionId(id: string): id is ActionId {
  return id in STEPS;
}

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
      if (!isActionId(actionId)) return;

      const key = `${componentId}:${actionId}`;
      if (handledActions.current.has(key)) return;
      handledActions.current.add(key);

      const step = STEPS[actionId];
      if (step.requiresClaimId && !claimIdRef.current) {
        console.warn(`[insurance-flow] ${actionId} fired before claim id was available`);
        return;
      }

      const values = (currentStore.getComponentState(componentId)?.values ?? {}) as Record<
        string,
        unknown
      >;

      step
        .call(values, claimIdRef.current)
        .then(async (result) => {
          if (result.claimId) claimIdRef.current = result.claimId;
          await sendHiddenRef.current(result.message);
        })
        .catch((err) => {
          handledActions.current.delete(key);
          console.error('[insurance-flow] backend call failed', err);
        });
    });
  }, [currentStore]);

  return {
    reset: () => {
      handledActions.current.clear();
      claimIdRef.current = null;
    },
  };
}
