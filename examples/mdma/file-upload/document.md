# Job Application

Submit your application with a resume and optional portfolio samples.

---

## Applicant Details

```mdma
id: application-form
type: form
fields:
  - name: full_name
    type: text
    label: Full Name
    required: true
  - name: email
    type: email
    label: Email Address
    required: true
    sensitive: true
  - name: resume
    type: file
    label: Resume
    required: true
  - name: portfolio
    type: file
    label: Portfolio Samples
  - name: cover_letter
    type: textarea
    label: Cover Letter
    validation:
      min: 50
      message: Please write at least 50 characters.
onSubmit: submit-application
```

```mdma
id: submit-btn
type: button
text: Submit Application
variant: primary
onAction: submit-application
confirm:
  title: Submit Application?
  message: Once submitted, you will not be able to edit your application.
  confirmText: Submit
  cancelText: Keep Editing
```

---

We review every application. Expect a response within 5 business days.
