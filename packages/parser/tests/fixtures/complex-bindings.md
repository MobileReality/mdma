# Binding Test

```mdma
id: data-form
type: form
fields:
  - name: user_email
    type: email
    label: Email
    required: true
  - name: user_name
    type: text
    label: Name
```

## Data Table

```mdma
id: data-table
type: table
columns:
  - key: name
    header: Name
  - key: email
    header: Email
data: "{{results}}"
visible: "{{show_table}}"
```
