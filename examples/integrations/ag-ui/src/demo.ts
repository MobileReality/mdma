/**
 * The ▶ Play demo replay: a scripted conversation sent hands-free, one line at a time, each waiting
 * for the previous run to finish.
 *
 * Play reloads the page with `?demo=1` rather than resetting in place — a replay has to start from a
 * fresh thread AND a clean bridge (documents, shared state, activity all accumulate), and a reload
 * is the honest way to get all of that. It drives the live LLM, so replays are close but not
 * byte-identical.
 */
import { useEffect, useRef, useState } from 'react';

export const DEMO_SCRIPT = [
  'hi',
  'bug report pls',
  'what do you need from me?',
  "ok so I opened the app, went through onboarding, and tapped into the Notifications screen — instead of showing the notifications list it closed and dropped me back to the home screen. I expected the list to load. This is on the dev environment. I'm not really sure how bad it is.",
  'how big is it?',
  'ok set high',
];

/** Pause between turns so the replay reads at a human pace. */
const TURN_GAP_MS = 700;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Start a replay by reloading into demo mode. */
export function startDemo(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('demo', '1');
  window.history.replaceState(null, '', url);
  window.location.reload();
}

/**
 * Runs the script once, as soon as `ready` flips true and the page is in demo mode.
 * `sendTurn` should resolve when that turn's run has finished.
 */
export function useDemoPlayback(ready: boolean, sendTurn: (text: string) => Promise<void>) {
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: run at most once, when the agent is ready
  useEffect(() => {
    if (started.current || !ready) return;
    if (!new URLSearchParams(window.location.search).get('demo')) return;
    started.current = true;

    (async () => {
      setPlaying(true);
      try {
        for (const text of DEMO_SCRIPT) {
          await sendTurn(text);
          await sleep(TURN_GAP_MS);
        }
      } finally {
        setPlaying(false);
      }
    })();
  }, [ready]);

  return playing;
}
