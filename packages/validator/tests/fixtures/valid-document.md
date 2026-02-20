# Valid Document

Some introductory text.

```mdma
type: thinking
id: analysis-thinking
label: Analyzing request
status: done
collapsed: true
content: |
  Reviewing the user's request.
  Preparing the response.
```

## User Form

```mdma
type: form
id: contact-form
fields:
  - name: email
    type: email
    label: Email Address
    required: true
    sensitive: true
  - name: message
    type: textarea
    label: Message
```

```mdma
type: button
id: submit-btn
text: Submit
variant: primary
onAction: contact-form
```
