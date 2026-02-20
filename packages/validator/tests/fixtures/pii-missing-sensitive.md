# PII Without Sensitive Flags

```mdma
type: form
id: user-form
fields:
  - name: email
    type: email
    label: Email Address
    required: true
  - name: phone
    type: text
    label: Phone Number
  - name: ssn
    type: text
    label: Social Security Number
  - name: notes
    type: textarea
    label: Notes
```

```mdma
type: table
id: users-table
columns:
  - key: name
    header: Name
  - key: email
    header: Email Address
  - key: address
    header: Home Address
data:
  - { name: "John", email: "john@example.com", address: "123 Main St" }
```
