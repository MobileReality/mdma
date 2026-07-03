---
"@mobile-reality/mdma-renderer-react": minor
"@mobile-reality/mdma-agui": minor
---

Support tasklist completion and webhook triggers as routable events. The tasklist renderer now
emits `ACTION_TRIGGERED` (its `onComplete` action) on the transition into all-items-checked, and
the webhook renderer gains a trigger button that emits `INTEGRATION_CALLED`. The `mdma-agui`
bridge routes both back into the agent run — alongside form submit, button, and approve/deny — so
completing a checklist or firing a webhook resumes the AG-UI conversation.
