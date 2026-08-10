import type { DocumentStore } from '@mobile-reality/mdma-runtime';

/**
 * Every action a component triggers is executed in the main process, and its
 * outcome is dispatched back so bindings like `{{component.lastResult}}` resolve.
 * The renderer never holds the credentials the action uses, and cannot skip the
 * policy check that gates it.
 */
export function runActionsInMain(store: DocumentStore): () => void {
  return store.getEventBus().on('ACTION_TRIGGERED', (action) => {
    void window.mdma.actions
      .run({
        componentId: action.componentId,
        actionId: action.actionId,
        payload: action.payload,
      })
      .then((outcome) => {
        store.dispatch({
          type: 'INTEGRATION_CALLED',
          componentId: action.componentId,
          integrationId: action.actionId,
          result: outcome.ok
            ? outcome.result
            : { error: outcome.error, denied: outcome.deniedByPolicy },
        });
      });
  });
}
