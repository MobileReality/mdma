import type { FormComponent, FormField, MdmaComponent } from '@mobile-reality/mdma-spec';
import { useCallback, useRef, useState } from 'react';
import type { PreviewState } from './use-preview-validation.js';

/**
 * Auto-play for the insurance-claim preview — the form-driven analogue of the
 * scripted `DEMO_SCRIPT` in AgentChatView.
 *
 * Where the agent chat demo only types and sends text, this flow is interactive:
 * the agent renders a form, the user fills + submits it, and `useInsuranceFlow`
 * advances to the next step. So auto-play here (1) sends a kickoff message, then
 * (2) for each rendered step form, fills its fields with scripted answers and
 * dispatches the submit `ACTION_TRIGGERED` on the live store — exactly what a
 * human clicking "Submit" does. `useInsuranceFlow` (subscribed to the same
 * store) then calls the backend and advances the agent to the next step.
 *
 * This lets you run the same custom claim flow hands-free against the own-model
 * (Agent Settings) and compare it to frontier models.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const KICKOFF = "Hi — I'd like to file a new insurance claim.";

// The flow's three form steps, in order (step 4 is a terminal callout — no form).
const FLOW_ACTIONS = ['collect-personal-info', 'collect-claim', 'collect-bank'] as const;

// Scripted answers keyed by field name; falls back to a value by field type.
const ANSWERS: Record<string, string> = {
  'full-name': 'Jamie Rivera',
  birthday: '1988-03-22',
  'claim-description':
    'A pipe under the kitchen sink burst overnight and flooded the floor, damaging the lower cabinets and the flooring.',
  iban: 'DE89370400440532013000',
};

function answerForField(field: FormField): string | boolean {
  if (field.name in ANSWERS) return ANSWERS[field.name];
  switch (field.type) {
    case 'checkbox':
      return true;
    case 'number':
      return '42';
    case 'email':
      return 'jamie.rivera@example.com';
    case 'date':
      return '1990-01-01';
    case 'textarea':
      return 'Additional details provided for the demo run.';
    case 'select': {
      const opts = field.options;
      if (Array.isArray(opts) && opts.length > 0) {
        const first = opts[0];
        return typeof first === 'string' ? first : first.value;
      }
      return '';
    }
    case 'file':
      return '';
    default:
      return 'Sample value';
  }
}

function findForm(ast: PreviewState['ast']): FormComponent | null {
  if (!ast) return null;
  for (const child of ast.children) {
    if ((child as { type?: string }).type !== 'mdmaBlock') continue;
    const component = (child as { component?: MdmaComponent }).component;
    if (component?.type === 'form') return component as FormComponent;
  }
  return null;
}

interface UsePreviewAutoplayOptions {
  previewState: PreviewState;
  isGenerating: boolean;
  sendText: (message: string) => Promise<void>;
  setInput: (value: string) => void;
  /** Resets the chat, flow state and backend log before a fresh run. */
  reset: () => void;
}

export function usePreviewAutoplay({
  previewState,
  isGenerating,
  sendText,
  setInput,
  reset,
}: UsePreviewAutoplayOptions): { isPlaying: boolean; play: () => void } {
  const [isPlaying, setIsPlaying] = useState(false);
  const playingRef = useRef(false);

  // Keep the latest reactive values readable from inside the async play loop.
  const stateRef = useRef(previewState);
  stateRef.current = previewState;
  const generatingRef = useRef(isGenerating);
  generatingRef.current = isGenerating;

  // Poll `predicate` until it returns a truthy value, play is stopped, or timeout.
  const waitFor = useCallback(
    async <T>(predicate: () => T | null, timeoutMs = 60_000): Promise<T | null> => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (!playingRef.current) return null;
        const result = predicate();
        if (result) return result;
        await sleep(150);
      }
      return null;
    },
    [],
  );

  const play = useCallback(() => {
    // Toggle: a second press stops the run.
    if (playingRef.current) {
      playingRef.current = false;
      setIsPlaying(false);
      return;
    }
    playingRef.current = true;
    setIsPlaying(true);

    void (async () => {
      reset();
      await sleep(500);

      // Typewriter the kickoff message into the input, then send it.
      for (let k = 1; k <= KICKOFF.length; k++) {
        if (!playingRef.current) break;
        setInput(KICKOFF.slice(0, k));
        await sleep(22);
      }
      await sleep(250);
      setInput('');
      if (playingRef.current) await sendText(KICKOFF);

      let lastBlockId: string | null = null;
      for (const action of FLOW_ACTIONS) {
        if (!playingRef.current) break;

        // Wait for a freshly-rendered, validated form for this step.
        const found = await waitFor(() => {
          if (generatingRef.current) return null;
          const s = stateRef.current;
          if (s.status !== 'ready' || !s.ast || !s.store || s.blockId === lastBlockId) return null;
          const form = findForm(s.ast);
          if (!form || form.onSubmit !== action) return null;
          return { form, store: s.store, blockId: s.blockId };
        });
        if (!found) {
          console.warn(`[preview-autoplay] timed out waiting for "${action}" form`);
          break;
        }

        // Fill each field, then submit — same dispatches a human click produces.
        await sleep(450);
        for (const field of found.form.fields) {
          if (!playingRef.current) break;
          found.store.dispatch({
            type: 'FIELD_CHANGED',
            componentId: found.form.id,
            field: field.name,
            value: answerForField(field),
          });
          await sleep(130);
        }
        await sleep(300);
        if (!playingRef.current) break;
        found.store.dispatch({
          type: 'ACTION_TRIGGERED',
          componentId: found.form.id,
          actionId: found.form.onSubmit,
        });
        lastBlockId = found.blockId;

        // Let useInsuranceFlow call the backend + advance the agent to the next step.
        await sleep(1000);
      }

      playingRef.current = false;
      setIsPlaying(false);
    })();
  }, [reset, sendText, setInput, waitFor]);

  return { isPlaying, play };
}
