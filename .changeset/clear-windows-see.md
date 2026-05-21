---
"@mobile-reality/mdma-validator": minor
"@mobile-reality/mdma-spec": minor
"@mobile-reality/mdma-prompt-pack": patch
"@mobile-reality/mdma-demo": patch
---

Split validator into per-block validate() and multi-message validateConversation(); make form.onSubmit required and rewrite action-label fields as opaque labels (drop the action-references rule); add many model-specific fixer/author/agent-tool prompt variants (gpt-5.x family, Claude opus/sonnet/haiku, Gemini 2.5/3, Grok), promote the conversation-judge prompt out of mdma-fixer/ and rename its export to MDMA_CONVERSATION_JUDGE.
