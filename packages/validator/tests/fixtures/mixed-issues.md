# Mixed Issues

```mdma
type: form
id: myForm
fields:
  - name: email
    type: email
    label: Email Address
    required: true
  - name: phone
    type: text
    label: Phone Number
onSubmit: submitBtn
```

```mdma
type: callout
id: myForm
variant: info
content: Duplicate ID with the form
```

```mdma
type: button
id: submitBtn
text: Submit
variant: primary
onAction: myForm
```
