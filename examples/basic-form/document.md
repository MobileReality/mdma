# Contact Us

A simple contact form that collects a name, email, and message, then submits via a button.

---

## Get in Touch

```mdma
id: contact-form
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
  - name: message
    type: textarea
    label: Message
    required: true
    validation:
      min: 10
      message: Please enter at least 10 characters.
onSubmit: submit-contact
```

```mdma
id: send-btn
type: button
text: Send Message
variant: primary
onAction: submit-contact
confirm:
  title: Confirm Submission
  message: Are you sure you want to send this message?
  confirmText: Send
  cancelText: Go Back
```

---

Thank you for reaching out. We will respond within 2 business days.
