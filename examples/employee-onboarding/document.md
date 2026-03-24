# Employee Onboarding

Welcome your new team member and guide them through the onboarding process.

---

## Welcome

```mdma
id: welcome-banner
type: callout
variant: success
title: Welcome to the Team!
content: >
  We're thrilled to have you on board. Please complete the steps below
  to get set up. Your buddy and manager will be notified once you finish.
```

## Personal Information

```mdma
id: personal-info
type: form
fields:
  - name: full_name
    type: text
    label: Full Name
    required: true
  - name: preferred_name
    type: text
    label: Preferred Name
  - name: personal_email
    type: email
    label: Personal Email
    required: true
    sensitive: true
  - name: phone
    type: text
    label: Phone Number
    sensitive: true
  - name: emergency_contact
    type: text
    label: Emergency Contact Name & Phone
    required: true
    sensitive: true
  - name: t_shirt_size
    type: select
    label: T-Shirt Size (for swag)
    options:
      - { label: XS, value: xs }
      - { label: S, value: s }
      - { label: M, value: m }
      - { label: L, value: l }
      - { label: XL, value: xl }
      - { label: XXL, value: xxl }
  - name: dietary_restrictions
    type: text
    label: Dietary Restrictions (for team lunches)
onSubmit: submit-personal-info
```

## Equipment Setup

```mdma
id: equipment-form
type: form
fields:
  - name: laptop
    type: select
    label: Laptop Preference
    required: true
    options:
      - { label: "MacBook Pro 14\"", value: mbp-14 }
      - { label: "MacBook Pro 16\"", value: mbp-16 }
      - { label: "ThinkPad X1 Carbon", value: thinkpad-x1 }
      - { label: "Dell XPS 15", value: dell-xps }
  - name: monitor
    type: select
    label: External Monitor
    options:
      - { label: "None", value: none }
      - { label: "27\" 4K", value: 27-4k }
      - { label: "34\" Ultrawide", value: 34-uw }
  - name: keyboard
    type: select
    label: Keyboard Layout
    required: true
    options:
      - { label: US QWERTY, value: us }
      - { label: UK QWERTY, value: uk }
      - { label: German QWERTZ, value: de }
onSubmit: submit-equipment
```

## First Week Checklist

```mdma
id: onboarding-tasks
type: tasklist
items:
  - id: accept-invite
    text: Accept calendar invite for orientation
    required: true
  - id: setup-email
    text: Set up company email and Slack
    required: true
  - id: read-handbook
    text: Read the employee handbook
    required: true
  - id: meet-buddy
    text: Schedule 1:1 with your onboarding buddy
    required: true
  - id: setup-dev-env
    text: Set up development environment
  - id: first-pr
    text: Submit your first pull request (update the team page)
  - id: attend-standup
    text: Attend your first team standup
    required: true
  - id: complete-security
    text: Complete security awareness training
    required: true
onComplete: onboarding-complete
```

## Manager Sign-off

```mdma
id: manager-signoff
type: approval-gate
title: Manager Confirmation
description: Confirm that the new hire has completed all required onboarding steps.
requiredApprovers: 1
allowedRoles:
  - manager
  - hr-admin
onApprove: onboarding-approved
```

---

Once approved, the employee is fully onboarded and gains access to all team resources.
