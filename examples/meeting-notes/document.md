# Sprint Retrospective

Capture team feedback, action items, and improvement commitments from the sprint retro.

---

```mdma
id: sprint-info
type: callout
variant: info
title: "Sprint 24 Retrospective — March 18, 2024"
content: >
  Team: Platform Engineering. Sprint duration: Mar 4–15. Velocity: 42 points
  (target: 45). Sprint goal: Auth service migration — 90% complete.
```

## Sprint Metrics

```mdma
id: velocity-chart
type: chart
variant: bar
label: Sprint Velocity (Last 6 Sprints)
data: |
  Sprint, Planned, Completed
  Sprint 19, 40, 38
  Sprint 20, 42, 44
  Sprint 21, 45, 41
  Sprint 22, 43, 43
  Sprint 23, 45, 47
  Sprint 24, 45, 42
xAxis: Sprint
```

## Bug Distribution

```mdma
id: bug-chart
type: chart
variant: pie
label: Bugs by Category
data: |
  Category, Count
  Auth Service, 5
  API Gateway, 3
  Frontend, 7
  Database, 2
  CI/CD, 1
xAxis: Category
```

## Team Feedback

```mdma
id: retro-form
type: form
fields:
  - name: went_well
    type: textarea
    label: "What went well?"
    required: true
  - name: could_improve
    type: textarea
    label: "What could be improved?"
    required: true
  - name: action_items
    type: textarea
    label: "Suggested action items"
    required: true
  - name: shoutout
    type: text
    label: "Team shoutout (who deserves recognition?)"
  - name: mood
    type: select
    label: Overall Sprint Mood
    required: true
    options:
      - { label: "Great — on track and energized", value: great }
      - { label: "Good — steady progress", value: good }
      - { label: "Okay — some friction", value: okay }
      - { label: "Rough — need to address issues", value: rough }
onSubmit: submit-retro
```

## Action Items from Last Retro

```mdma
id: previous-actions
type: tasklist
items:
  - id: ci-speed
    text: "Reduce CI pipeline time from 18min to under 10min"
    checked: true
  - id: on-call-docs
    text: "Update on-call runbook for auth service"
    checked: true
  - id: pair-sessions
    text: "Schedule weekly pair programming sessions"
  - id: flaky-tests
    text: "Fix top 5 flaky tests in the integration suite"
    checked: true
  - id: backlog-grooming
    text: "Groom backlog before sprint planning (not during)"
```

## Submit Notes

```mdma
id: submit-retro-btn
type: button
text: Submit Retrospective
variant: primary
onAction: submit-retro
```

---

Action items will be tracked in the next sprint and reviewed at the following retrospective.
