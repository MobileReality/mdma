# Patient Intake

Please fill in the following form.

```mdma
id: intake-form
type: form
fields:
  - name: patient_name
    type: text
    label: Patient Name
    required: true
    sensitive: true
  - name: severity
    type: select
    label: Severity
    options:
      - { label: Critical, value: P1 }
      - { label: High, value: P2 }
      - { label: Medium, value: P3 }
onSubmit: submit-intake
```

Thank you for submitting.
