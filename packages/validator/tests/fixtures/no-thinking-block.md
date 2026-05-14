# No Thinking Block

```mdma
type: form
id: my-form
fields:
  - name: title
    type: text
    label: Title
    required: true
onSubmit: submit-btn
```

```mdma
type: button
id: submit-btn
text: Submit
onAction: my-form
```
