# Customer Satisfaction Survey

Collect structured feedback after a support interaction to measure service quality and identify improvements.

---

```mdma
id: thank-you
type: callout
variant: info
title: Your Feedback Matters
content: >
  Thank you for taking a moment to share your experience. Your responses
  help us improve our support quality. This survey takes about 2 minutes.
dismissible: true
```

## Rate Your Experience

```mdma
id: survey-form
type: form
fields:
  - name: ticket_id
    type: text
    label: Support Ticket ID
    required: true
  - name: overall_rating
    type: select
    label: Overall Satisfaction
    required: true
    options:
      - { label: "5 - Excellent", value: "5" }
      - { label: "4 - Good", value: "4" }
      - { label: "3 - Average", value: "3" }
      - { label: "2 - Poor", value: "2" }
      - { label: "1 - Very Poor", value: "1" }
  - name: response_time
    type: select
    label: Response Time Rating
    required: true
    options:
      - { label: "5 - Very Fast", value: "5" }
      - { label: "4 - Fast", value: "4" }
      - { label: "3 - Average", value: "3" }
      - { label: "2 - Slow", value: "2" }
      - { label: "1 - Very Slow", value: "1" }
  - name: agent_knowledge
    type: select
    label: Agent Knowledge Rating
    required: true
    options:
      - { label: "5 - Very Knowledgeable", value: "5" }
      - { label: "4 - Knowledgeable", value: "4" }
      - { label: "3 - Average", value: "3" }
      - { label: "2 - Lacking", value: "2" }
      - { label: "1 - Poor", value: "1" }
  - name: issue_resolved
    type: checkbox
    label: Was your issue fully resolved?
  - name: would_recommend
    type: checkbox
    label: Would you recommend our support to others?
  - name: comments
    type: textarea
    label: Additional Comments
  - name: contact_me
    type: checkbox
    label: I'd like to be contacted about my feedback
  - name: email
    type: email
    label: Email (optional)
    sensitive: true
onSubmit: submit-survey
```

## Submit Feedback

```mdma
id: submit-survey-btn
type: button
text: Submit Feedback
variant: primary
onAction: submit-survey
```

---

Your feedback has been recorded. If you requested a follow-up, our team will reach out within 48 hours.
