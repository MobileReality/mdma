# Bad Bindings

```mdma
type: form
id: user-form
fields:
  - name: email
    type: email
    label: Email
    required: true
    sensitive: true
```

```mdma
type: table
id: results-table
columns:
  - key: email
    header: Email
    sensitive: true
data: "{{ user_form.email }}"
```

```mdma
type: callout
id: notice
content: "Hello {user_form.email}, welcome!"
```
