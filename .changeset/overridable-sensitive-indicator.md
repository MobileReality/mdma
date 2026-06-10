---
"@mobile-reality/mdma-renderer-react": minor
---

Make the sensitive-field (PII) marker overridable. `FormRenderer` now resolves
the 🔒 badge through the element-override system under the `sensitiveIndicator`
key, so consumers can restyle it — or return `null` to opt a form scope out of
the badge entirely — without CSS hacks. The default rendering is unchanged.

Also exports `FormSensitiveIndicatorElementProps` (the new override's props) and
`FormFileElementProps` (previously unexported).
