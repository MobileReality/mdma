/**
 * Multi-step conversational flows for example documents.
 *
 * Each flow is an array of turns. The first turn loads automatically when
 * the user selects the example. Subsequent turns load when the user
 * interacts with the previous step (e.g. form submit, button click).
 */

export interface FlowStep {
  /** Simulated user message for this step */
  userMessage: string;
  /** MDMA markdown response for this step */
  markdown: string;
}

export interface ExampleFlow {
  label: string;
  /** Custom prompt that teaches the LLM the domain context for this flow. */
  customPrompt: string;
  steps: FlowStep[];
}

export const exampleFlows: Record<string, ExampleFlow> = {
  'contact-form': {
    label: 'Contact Form',
    customPrompt: `You are a website assistant that helps visitors get in touch with the company.

When a user wants to contact the company:
1. Present a contact form with fields: Full Name (required), Email Address (required, sensitive), and Message (required, min 10 chars).
2. After submission, show a success callout confirming the message was received.
3. Offer to help with anything else.

Keep responses friendly and professional. Response time is 2 business days.`,
    steps: [
      {
        userMessage: 'I need a contact form for our website',
        markdown: `# Contact Us

We'd love to hear from you! Please fill out the form below and we'll get back to you within 2 business days.

\`\`\`mdma
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
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Thank you for reaching out! Here's a confirmation of your submission:

\`\`\`mdma
id: success-notice
type: callout
variant: success
title: Message Sent
content: "Your message has been received. Our team will review it and respond within 2 business days."
dismissible: true
\`\`\`

Is there anything else I can help you with?`,
      },
    ],
  },

  'bug-report': {
    label: 'Bug Report',
    customPrompt: `You are an engineering support assistant that helps teams file and triage bug reports.

When a user reports a bug:
1. First collect bug details: Title, Severity (P0-P3), Affected Component, Environment, Steps to Reproduce, Expected Behavior, Actual Behavior.
2. Mark reporter email as sensitive.
3. After the form is submitted, present a triage checklist: reproduce bug, attach logs, assign team, set fix timeline, document workaround.
4. Once triage is complete, show a success confirmation and offer an escalation button (danger variant with confirmation dialog).

For P0/P1 bugs, always remind the user to also notify the on-call engineer via PagerDuty.`,
    steps: [
      {
        userMessage: 'I found a bug and need to report it',
        markdown: `# Bug Report

Let me help you file a structured bug report. Please provide the details below:

\`\`\`mdma
id: severity-notice
type: callout
variant: error
title: Critical Bugs
content: "If this bug causes data loss or a security vulnerability, also notify the on-call engineer via PagerDuty immediately."
dismissible: true
\`\`\`

\`\`\`mdma
id: bug-form
type: form
fields:
  - name: title
    type: text
    label: Bug Title
    required: true
  - name: severity
    type: select
    label: Severity
    required: true
    options:
      - { label: "P0 - Critical (service down)", value: p0 }
      - { label: "P1 - High (major feature broken)", value: p1 }
      - { label: "P2 - Medium (workaround exists)", value: p2 }
      - { label: "P3 - Low (cosmetic / minor)", value: p3 }
  - name: component
    type: select
    label: Affected Component
    required: true
    options:
      - { label: Frontend, value: frontend }
      - { label: Backend API, value: backend }
      - { label: Database, value: database }
      - { label: Authentication, value: auth }
      - { label: Payments, value: payments }
  - name: steps_to_reproduce
    type: textarea
    label: Steps to Reproduce
    required: true
  - name: expected_behavior
    type: textarea
    label: Expected Behavior
    required: true
  - name: actual_behavior
    type: textarea
    label: Actual Behavior
    required: true
onSubmit: submit-bug
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Got it! Now let's make sure this gets triaged properly. Please complete the checklist:

\`\`\`mdma
id: triage-checklist
type: tasklist
items:
  - id: reproduced
    text: "Bug reproduced by a second engineer"
    required: true
  - id: logs-attached
    text: "Relevant logs and stack traces attached"
    required: true
  - id: assigned
    text: "Assigned to responsible team"
    required: true
  - id: workaround-documented
    text: "Workaround documented (if available)"
\`\`\`

\`\`\`mdma
id: triage-done-btn
type: button
text: Complete Triage
variant: primary
onAction: triage-done
\`\`\``,
      },
      {
        userMessage: '[Checklist completed]',
        markdown: `Triage complete. The bug report has been filed and assigned.

\`\`\`mdma
id: bug-filed
type: callout
variant: success
title: Bug Report Filed
content: "Ticket created and assigned to the responsible team. You'll receive updates via email."
\`\`\`

\`\`\`mdma
id: escalate-btn
type: button
text: Escalate to Engineering Lead
variant: danger
onAction: escalate
confirm:
  title: Escalate Bug?
  message: This will page the engineering lead and mark this as urgent. Continue?
  confirmText: Escalate
  cancelText: Cancel
\`\`\``,
      },
    ],
  },

  'employee-onboarding': {
    label: 'Employee Onboarding',
    customPrompt: `You are an HR onboarding assistant that guides new employees through their first-week setup.

The onboarding flow has 4 steps:
1. Personal Information — collect: Full Name, Preferred Name, Personal Email (sensitive), Phone (sensitive), Emergency Contact (sensitive), T-Shirt Size, Dietary Restrictions.
2. Equipment Setup — collect: Laptop Preference (MacBook Pro 14"/16", ThinkPad X1, Dell XPS), External Monitor (None, 27" 4K, 34" Ultrawide), Keyboard Layout (US/UK/DE).
3. First Week Checklist — tasks: accept orientation invite, set up email/Slack, read handbook, meet buddy, set up dev environment, attend standup, complete security training.
4. Manager Sign-off — approval gate requiring manager or HR admin confirmation.

Be welcoming and encouraging. Mark all PII fields as sensitive.`,
    steps: [
      {
        userMessage: 'We have a new team member starting — help me set up their onboarding',
        markdown: `# Welcome Aboard!

Let's get your new hire set up. First, we'll collect their personal information.

\`\`\`mdma
id: welcome-banner
type: callout
variant: success
title: Welcome to the Team!
content: "We're thrilled to have you on board. Let's get you set up step by step."
\`\`\`

\`\`\`mdma
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
onSubmit: submit-personal-info
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Great, personal info saved! Now let's pick your equipment:

\`\`\`mdma
id: equipment-form
type: form
fields:
  - name: laptop
    type: select
    label: Laptop Preference
    required: true
    options:
      - { label: "MacBook Pro 14\\"", value: mbp-14 }
      - { label: "MacBook Pro 16\\"", value: mbp-16 }
      - { label: "ThinkPad X1 Carbon", value: thinkpad-x1 }
      - { label: "Dell XPS 15", value: dell-xps }
  - name: monitor
    type: select
    label: External Monitor
    options:
      - { label: "None", value: none }
      - { label: "27\\" 4K", value: 27-4k }
      - { label: "34\\" Ultrawide", value: 34-uw }
  - name: keyboard
    type: select
    label: Keyboard Layout
    required: true
    options:
      - { label: US QWERTY, value: us }
      - { label: UK QWERTY, value: uk }
      - { label: German QWERTZ, value: de }
onSubmit: submit-equipment
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Equipment order placed! Here's your first-week checklist — complete these to finish onboarding:

\`\`\`mdma
id: onboarding-tasks
type: tasklist
items:
  - id: accept-invite
    text: "Accept calendar invite for orientation"
    required: true
  - id: setup-email
    text: "Set up company email and Slack"
    required: true
  - id: read-handbook
    text: "Read the employee handbook"
    required: true
  - id: meet-buddy
    text: "Schedule 1:1 with your onboarding buddy"
    required: true
  - id: setup-dev-env
    text: "Set up development environment"
  - id: attend-standup
    text: "Attend your first team standup"
    required: true
  - id: complete-security
    text: "Complete security awareness training"
    required: true
\`\`\`

\`\`\`mdma
id: onboarding-complete-btn
type: button
text: Complete Onboarding Checklist
variant: primary
onAction: onboarding-complete
\`\`\``,
      },
      {
        userMessage: '[Checklist completed]',
        markdown: `All tasks complete! The final step is manager sign-off:

\`\`\`mdma
id: manager-signoff
type: approval-gate
title: Manager Confirmation
description: "Confirm that the new hire has completed all required onboarding steps."
requiredApprovers: 1
allowedRoles:
  - manager
  - hr-admin
onApprove: onboarding-approved
\`\`\``,
      },
    ],
  },

  'budget-approval': {
    label: 'Budget Approval',
    customPrompt: `You are a finance assistant that helps employees submit and track budget approval requests.

The budget approval flow has 3 steps:
1. Request Details — collect: Requester Name, Requester Email (sensitive), Department (Engineering/Marketing/Operations/Finance), Requested Amount (USD, must be > 0), Business Justification (min 20 chars). Show a warning callout that requests over $5,000 require director-level approval.
2. Prerequisites Checklist — tasks: confirm budget code, attach vendor quote, brief manager, document alternatives, provide timeline.
3. Manager Approval — approval gate requiring manager/director/VP Finance sign-off with reason required. Include a "Finalize Budget Request" button with confirmation dialog.

Be professional and guide the user through each step clearly.`,
    steps: [
      {
        userMessage: 'I need to submit a budget request for my team',
        markdown: `# Budget Approval Request

Let's prepare your budget request. Please fill out the details below:

\`\`\`mdma
id: budget-warning
type: callout
variant: warning
title: Review Required
content: "All budget requests over $5,000 require director-level approval. Ensure all supporting documents are attached before submitting."
\`\`\`

\`\`\`mdma
id: budget-form
type: form
fields:
  - name: requester_name
    type: text
    label: Requester Name
    required: true
  - name: requester_email
    type: email
    label: Requester Email
    required: true
    sensitive: true
  - name: department
    type: select
    label: Department
    required: true
    options:
      - { label: Engineering, value: engineering }
      - { label: Marketing, value: marketing }
      - { label: Operations, value: operations }
      - { label: Finance, value: finance }
  - name: amount
    type: number
    label: Requested Amount (USD)
    required: true
  - name: justification
    type: textarea
    label: Business Justification
    required: true
onSubmit: submit-budget-request
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Request details saved. Before we send it for approval, please complete these prerequisites:

\`\`\`mdma
id: prereq-checklist
type: tasklist
items:
  - id: budget-code
    text: "Confirm budget code and cost center"
    required: true
  - id: vendor-quote
    text: "Attach vendor quote or estimate"
    required: true
  - id: manager-briefed
    text: "Brief your direct manager verbally"
    required: true
  - id: alt-options
    text: "Document alternative options considered"
  - id: timeline
    text: "Provide expected delivery timeline"
\`\`\`

\`\`\`mdma
id: prereqs-done-btn
type: button
text: Prerequisites Complete
variant: primary
onAction: prereqs-done
\`\`\``,
      },
      {
        userMessage: '[Checklist completed]',
        markdown: `Prerequisites confirmed. Your request is now ready for manager approval:

\`\`\`mdma
id: manager-approval
type: approval-gate
title: Manager Approval
description: "The budget request requires manager sign-off to proceed."
requiredApprovers: 1
allowedRoles:
  - manager
  - director
  - vp-finance
onApprove: budget-approved
onDeny: budget-denied
requireReason: true
\`\`\`

\`\`\`mdma
id: finalize-btn
type: button
text: Finalize Budget Request
variant: primary
onAction: finalize-budget
confirm:
  title: Finalize Request
  message: "This will lock the request and notify procurement. Continue?"
  confirmText: Finalize
  cancelText: Cancel
\`\`\``,
      },
    ],
  },

  'customer-survey': {
    label: 'Customer Survey',
    customPrompt: `You are a customer experience assistant that collects post-support feedback.

When collecting feedback:
1. Present a survey form: Support Ticket ID, Overall Satisfaction (1-5), Response Time Rating (1-5), Issue Resolved (checkbox), Additional Comments, optional email (sensitive).
2. After submission, show a success callout confirming feedback was received. Mention 48-hour follow-up if requested.
3. Offer to show aggregated survey results if asked.

Keep the tone appreciative and concise. The survey should take about 2 minutes.`,
    steps: [
      {
        userMessage: 'I need to collect customer feedback after a support interaction',
        markdown: `# Customer Satisfaction Survey

Let's gather feedback from your customer. Here's a structured survey:

\`\`\`mdma
id: thank-you
type: callout
variant: info
title: Your Feedback Matters
content: "Thank you for taking a moment to share your experience. This survey takes about 2 minutes."
dismissible: true
\`\`\`

\`\`\`mdma
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
  - name: issue_resolved
    type: checkbox
    label: Was your issue fully resolved?
  - name: comments
    type: textarea
    label: Additional Comments
onSubmit: submit-survey
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Thank you for your feedback!

\`\`\`mdma
id: survey-thanks
type: callout
variant: success
title: Feedback Received
content: "Your response has been recorded. If you requested a follow-up, our team will reach out within 48 hours."
\`\`\`

Would you like to see a summary of recent survey results?`,
      },
    ],
  },

  'sales-dashboard': {
    label: 'Sales Dashboard',
    customPrompt: `You are a sales analytics assistant that presents quarterly sales performance data.

Available data for Q1 2024:
- Total revenue: $2.34M (target: $2.1M, 111% attainment)
- 12 new enterprise deals closed, net retention rate: 118%
- Monthly breakdown: Jan $720K, Feb $780K, Mar $840K (target: $700K/mo)
- Revenue by product: Platform $980K, Analytics $640K, Integrations $420K, Services $300K
- Deal distribution: Enterprise (>$100K): 12, Mid-Market ($25K-$100K): 28, SMB (<$25K): 45
- Q2 pipeline: $3.8M with 65% weighted coverage against $2.3M target

When presenting data:
1. Start with a summary callout and revenue charts (line for trend, bar for product breakdown).
2. On request, show deal breakdown (pie chart) and top deals table (sortable).
3. Offer a pipeline review checklist: update forecast, review lost deals, territory assignments, commission calculations, QBR deck.

Use charts and tables extensively. Be data-driven and concise.`,
    steps: [
      {
        userMessage: 'Show me the Q1 sales performance report',
        markdown: `# Q1 Sales Report

Here's your quarterly sales overview:

\`\`\`mdma
id: quarter-summary
type: callout
variant: success
title: "Q1 2024 — Target Exceeded"
content: "Total revenue: $2.34M (target: $2.1M, 111% attainment). 12 new enterprise deals closed."
\`\`\`

\`\`\`mdma
id: revenue-trend
type: chart
variant: line
label: Monthly Revenue ($)
data: |
  Month, Revenue, Target
  January, 720000, 700000
  February, 780000, 700000
  March, 840000, 700000
xAxis: Month
\`\`\`

\`\`\`mdma
id: product-revenue
type: chart
variant: bar
label: Revenue by Product
data: |
  Product, Q1 Revenue
  Platform, 980000
  Analytics, 640000
  Integrations, 420000
  Services, 300000
xAxis: Product
\`\`\`

Would you like to see the deal breakdown or pipeline review?`,
      },
      {
        userMessage: 'Show me the deal breakdown',
        markdown: `Here are the top deals this quarter:

\`\`\`mdma
id: deal-distribution
type: chart
variant: pie
label: Deals by Size
data: |
  Size, Count
  Enterprise (>$100K), 12
  Mid-Market ($25K-$100K), 28
  SMB (<$25K), 45
xAxis: Size
\`\`\`

\`\`\`mdma
id: top-deals
type: table
sortable: true
columns:
  - key: company
    header: Company
    sortable: true
  - key: deal_size
    header: Deal Size
    sortable: true
  - key: product
    header: Product
    sortable: true
  - key: stage
    header: Stage
    sortable: true
  - key: rep
    header: Sales Rep
    sortable: true
data:
  - { company: "TechCorp Inc.", deal_size: "$285,000", product: "Platform", stage: "Closed Won", rep: "Sarah Chen" }
  - { company: "GlobalBank", deal_size: "$210,000", product: "Analytics", stage: "Closed Won", rep: "Mike Johnson" }
  - { company: "HealthFirst", deal_size: "$175,000", product: "Platform", stage: "Closed Won", rep: "Sarah Chen" }
  - { company: "RetailMax", deal_size: "$150,000", product: "Integrations", stage: "Negotiation", rep: "Alex Rivera" }
  - { company: "EduLearn", deal_size: "$125,000", product: "Platform", stage: "Proposal", rep: "Lisa Park" }
\`\`\`

Want me to prepare the pipeline review checklist?`,
      },
      {
        userMessage: 'Yes, show the pipeline review',
        markdown: `Here's the Q2 pipeline review checklist:

\`\`\`mdma
id: pipeline-review
type: tasklist
items:
  - id: update-forecast
    text: "Update Q2 forecast in CRM"
    required: true
  - id: review-lost
    text: "Review lost deals and document reasons"
    required: true
  - id: territory-plan
    text: "Finalize Q2 territory assignments"
    required: true
  - id: commission-calc
    text: "Submit commission calculations to finance"
    required: true
  - id: qbr-deck
    text: "Prepare QBR presentation for leadership"
    required: true
\`\`\`

\`\`\`mdma
id: review-complete-btn
type: button
text: Complete Pipeline Review
variant: primary
onAction: review-complete
\`\`\``,
      },
    ],
  },

  'incident-triage': {
    label: 'Incident Triage',
    customPrompt: `You are an incident response assistant that helps engineering teams triage and resolve production incidents.

The incident triage flow has 3 steps:
1. Incident Details — collect: Incident Title, Reporter Email (sensitive), Severity (P1-P4), Affected Systems, Description.
2. Response Checklist — tasks: identify affected systems, assess blast radius, notify stakeholders, apply mitigation, document root cause.
3. Resolution — show success callout, provide "Notify Team" button and "Escalate to VP Engineering" button (danger variant with confirmation).

Be clear and actionable. For P1/P2 incidents, emphasize urgency.`,
    steps: [
      {
        userMessage: 'We have an incident — help me triage it',
        markdown: `# Incident Triage

Let's gather the incident details first:

\`\`\`mdma
id: severity-form
type: form
fields:
  - name: title
    type: text
    label: Incident Title
    required: true
  - name: reporter_email
    type: email
    label: Reporter Email
    required: true
    sensitive: true
  - name: severity
    type: select
    label: Severity
    required: true
    options:
      - { label: "P1 - Critical", value: critical }
      - { label: "P2 - High", value: high }
      - { label: "P3 - Medium", value: medium }
      - { label: "P4 - Low", value: low }
  - name: affected_systems
    type: text
    label: Affected Systems
    required: true
  - name: description
    type: textarea
    label: Incident Description
    required: true
onSubmit: submit-incident
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Incident logged. Now work through the response checklist:

\`\`\`mdma
id: response-checklist
type: tasklist
items:
  - id: identify
    text: "Identify affected systems"
    required: true
  - id: assess
    text: "Assess blast radius"
    required: true
  - id: communicate
    text: "Notify stakeholders"
    required: true
  - id: mitigate
    text: "Apply mitigation steps"
    required: true
  - id: document
    text: "Document root cause"
    required: true
\`\`\`

\`\`\`mdma
id: checklist-done-btn
type: button
text: Complete Response Checklist
variant: primary
onAction: checklist-done
\`\`\``,
      },
      {
        userMessage: '[Checklist completed]',
        markdown: `Response checklist complete. You can now notify the team:

\`\`\`mdma
id: incident-resolved
type: callout
variant: success
title: Incident Under Control
content: "All response steps completed. The incident is being monitored."
\`\`\`

\`\`\`mdma
id: notify-team-btn
type: button
text: Notify Team
variant: primary
onAction: notify-team
\`\`\`

\`\`\`mdma
id: escalate-btn
type: button
text: Escalate to VP Engineering
variant: danger
onAction: escalate
confirm:
  title: Escalate Incident?
  message: "This will page the VP of Engineering. Continue?"
  confirmText: Escalate
  cancelText: Cancel
\`\`\``,
      },
    ],
  },

  'feature-request': {
    label: 'Feature Request',
    customPrompt: `You are a product operations assistant that helps teams submit structured feature requests.

The feature request flow has 3 steps:
1. Request Details — collect: Feature Title, Requester Name, Requesting Team (Engineering/Sales/CS/Marketing/Product), Priority (Critical/High/Medium/Low), Description, Primary Use Case. Show an info callout about the 5-day review process.
2. Evaluation Criteria — checklist: customer validation (3+ customers), technical feasibility review (required), design mockup, success metrics (required), duplicate check (required).
3. Product Review — approval gate requiring product-manager or head-of-product sign-off with reason required. Include "Submit Feature Request" button.

Approved features are added to the roadmap. Be structured and thorough.`,
    steps: [
      {
        userMessage: 'I want to submit a feature request for the product team',
        markdown: `# Feature Request

Let me help you submit a structured feature request:

\`\`\`mdma
id: process-note
type: callout
variant: info
title: Feature Request Process
content: "All feature requests go through product review. Requests with strong business justification are prioritized. Average review time: 5 business days."
dismissible: true
\`\`\`

\`\`\`mdma
id: feature-form
type: form
fields:
  - name: title
    type: text
    label: Feature Title
    required: true
  - name: requester
    type: text
    label: Your Name
    required: true
  - name: team
    type: select
    label: Requesting Team
    required: true
    options:
      - { label: Engineering, value: engineering }
      - { label: Sales, value: sales }
      - { label: Customer Success, value: cs }
      - { label: Marketing, value: marketing }
      - { label: Product, value: product }
  - name: priority
    type: select
    label: Requested Priority
    required: true
    options:
      - { label: "Critical — blocking revenue", value: critical }
      - { label: "High — significant impact", value: high }
      - { label: "Medium — nice to have", value: medium }
      - { label: "Low — minor improvement", value: low }
  - name: description
    type: textarea
    label: Feature Description
    required: true
  - name: use_case
    type: textarea
    label: Primary Use Case
    required: true
onSubmit: submit-feature
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Request captured. Let's complete the evaluation criteria:

\`\`\`mdma
id: eval-checklist
type: tasklist
items:
  - id: customer-validated
    text: "Feature validated with at least 3 customers"
  - id: technical-feasibility
    text: "Technical feasibility reviewed with engineering"
    required: true
  - id: design-mockup
    text: "Design mockup or wireframe attached"
  - id: metrics-defined
    text: "Success metrics defined"
    required: true
  - id: no-duplicate
    text: "Confirmed no duplicate request exists"
    required: true
\`\`\`

\`\`\`mdma
id: evaluation-done-btn
type: button
text: Complete Evaluation
variant: primary
onAction: evaluation-done
\`\`\``,
      },
      {
        userMessage: '[Checklist completed]',
        markdown: `Evaluation complete. Your request is ready for product review:

\`\`\`mdma
id: product-review
type: approval-gate
title: Product Manager Review
description: "Product manager reviews the request for roadmap alignment and feasibility."
requiredApprovers: 1
allowedRoles:
  - product-manager
  - head-of-product
onApprove: feature-approved
onDeny: feature-declined
requireReason: true
\`\`\`

\`\`\`mdma
id: submit-feature-btn
type: button
text: Submit Feature Request
variant: primary
onAction: submit-feature
\`\`\``,
      },
    ],
  },

  'sprint-retro': {
    label: 'Sprint Retrospective',
    customPrompt: `You are a scrum master assistant that facilitates sprint retrospectives.

Sprint 24 context:
- Team: Platform Engineering, Sprint: Mar 4-15, 2024
- Velocity: 42 points (target: 45), Sprint goal: Auth service migration — 90% complete
- Historical velocity: Sprint 19: 38/40, Sprint 20: 44/42, Sprint 21: 41/45, Sprint 22: 43/43, Sprint 23: 47/45
- Bug distribution: Auth Service 5, API Gateway 3, Frontend 7, Database 2, CI/CD 1

The retro flow has 3 steps:
1. Sprint overview — show sprint info callout, velocity bar chart (last 6 sprints with planned vs completed), and bug distribution pie chart.
2. Team feedback form — collect: What went well, What could improve, Suggested action items, Team shoutout, Sprint mood (Great/Good/Okay/Rough).
3. Previous action items review — checklist of items from last retro (some pre-checked as done).

Use charts to visualize data. Be encouraging and focused on improvement.`,
    steps: [
      {
        userMessage: 'Let\'s run the sprint retrospective for Sprint 24',
        markdown: `# Sprint 24 Retrospective

Here's the sprint performance overview:

\`\`\`mdma
id: sprint-info
type: callout
variant: info
title: "Sprint 24 — March 4-15, 2024"
content: "Team: Platform Engineering. Velocity: 42 points (target: 45). Sprint goal: Auth service migration — 90% complete."
\`\`\`

\`\`\`mdma
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
\`\`\`

\`\`\`mdma
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
\`\`\`

Ready to capture team feedback?`,
      },
      {
        userMessage: 'Yes, let\'s capture the feedback',
        markdown: `Share your thoughts on the sprint:

\`\`\`mdma
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
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Feedback recorded. Let's review action items from last retro:

\`\`\`mdma
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
\`\`\`

\`\`\`mdma
id: submit-retro-btn
type: button
text: Submit Retrospective
variant: primary
onAction: submit-retro
\`\`\``,
      },
    ],
  },

  'order-tracking': {
    label: 'Order Tracking',
    customPrompt: `You are a customer service assistant for an e-commerce store that helps customers track their orders.

Order #ORD-2024-78542 details:
- Placed: March 15, 2024. Estimated delivery: March 22, 2024. Status: In Transit.
- Items: Wireless Keyboard ($79.99, Shipped), USB-C Hub x2 ($34.99 ea, Shipped), Monitor Stand ($129.99, Processing), Cable Management Kit ($19.99, Shipped)
- Cost: Products $299.95, Shipping $12.99, Tax $24.95
- Milestones: Order placed ✓, Payment ✓, Picked/packed ✓, Shipped ✓, In transit ✓, Out for delivery (pending), Delivered (pending)

The order flow has 2 steps:
1. Order overview — show order status callout, items table (sortable), delivery milestones checklist.
2. Cost breakdown — show pie chart and action buttons (Contact Support as secondary, Report Problem as danger with confirmation).

Be helpful and empathetic. If the customer reports an issue, offer to escalate.`,
    steps: [
      {
        userMessage: 'Show me the status of order #ORD-2024-78542',
        markdown: `# Order #ORD-2024-78542

Here's your order status:

\`\`\`mdma
id: order-info
type: callout
variant: info
title: "Order #ORD-2024-78542"
content: "Placed on March 15, 2024. Estimated delivery: March 22, 2024. Current status: In Transit."
\`\`\`

\`\`\`mdma
id: order-items
type: table
sortable: true
columns:
  - key: item
    header: Item
    sortable: true
  - key: qty
    header: Qty
  - key: price
    header: Unit Price
    sortable: true
  - key: status
    header: Status
    sortable: true
data:
  - { item: "Wireless Keyboard", qty: 1, price: "$79.99", status: "Shipped" }
  - { item: "USB-C Hub", qty: 2, price: "$34.99", status: "Shipped" }
  - { item: "Monitor Stand", qty: 1, price: "$129.99", status: "Processing" }
  - { item: "Cable Management Kit", qty: 1, price: "$19.99", status: "Shipped" }
\`\`\`

\`\`\`mdma
id: delivery-milestones
type: tasklist
items:
  - id: order-placed
    text: "Order placed and confirmed"
    checked: true
  - id: payment-processed
    text: "Payment processed"
    checked: true
  - id: shipped
    text: "Shipped from warehouse"
    checked: true
  - id: in-transit
    text: "In transit to delivery address"
    checked: true
  - id: out-for-delivery
    text: "Out for delivery"
  - id: delivered
    text: "Delivered"
\`\`\`

Would you like to see the cost breakdown or contact support?`,
      },
      {
        userMessage: 'Show me the cost breakdown',
        markdown: `Here's the cost breakdown for your order:

\`\`\`mdma
id: cost-chart
type: chart
variant: pie
label: Cost Breakdown
data: |
  Category, Amount
  Products, 299.95
  Shipping, 12.99
  Tax, 24.95
xAxis: Category
\`\`\`

\`\`\`mdma
id: contact-support-btn
type: button
text: Contact Support
variant: secondary
onAction: contact-support
\`\`\`

\`\`\`mdma
id: report-issue-btn
type: button
text: Report a Problem
variant: danger
onAction: report-issue
confirm:
  title: Report an Issue
  message: "This will open a support case for this order. Continue?"
  confirmText: Report Issue
  cancelText: Cancel
\`\`\``,
      },
    ],
  },

  'change-management': {
    label: 'Change Management',
    customPrompt: `You are a release management assistant that guides teams through production change approvals for SOX/ISO compliance.

The change management flow has 3 steps:
1. Change Request — collect: Change Request ID, JIRA Ticket, Change Title, Change Type (Standard/Normal/Emergency), Requestor Name & Team, Target Environment, Scheduled Date, Description, Business Justification, Affected Services, Risk Level (Low/Medium/High/Critical), Rollback Plan, Estimated Rollback Time, Test Evidence. Show a warning callout about risk assessment requirements.
2. Pre-Deployment Checklist — tasks: CI pipeline green, unit tests (>80% coverage), integration tests, security scan, database migrations, feature flags, monitoring/alerts, runbook, stakeholder communication, database backup, load testing, rollback tested in staging.
3. Dual Approval — Tech Lead sign-off (tech-lead/staff-engineer/principal-engineer) followed by Engineering Manager sign-off (engineering-manager/director/VP). Both required for SOX compliance.

Emphasize separation of duties and compliance requirements.`,
    steps: [
      {
        userMessage: 'I need to submit a production change request',
        markdown: `# Change Management

Let's prepare your change request. All production changes require documented risk assessment and dual approval.

\`\`\`mdma
id: risk-assessment-callout
type: callout
variant: warning
title: Risk Assessment Required
content: "All production changes must include a documented risk assessment. High-risk and emergency changes require CAB review. SOX Section 404 requires evidence of change authorization."
\`\`\`

\`\`\`mdma
id: change-request-form
type: form
fields:
  - name: change_id
    type: text
    label: Change Request ID
    required: true
  - name: jira_ticket
    type: text
    label: JIRA Ticket Reference
    required: true
  - name: change_title
    type: text
    label: Change Title
    required: true
  - name: change_type
    type: select
    label: Change Type
    required: true
    options:
      - { label: "Standard - Pre-approved low-risk", value: standard }
      - { label: "Normal - Requires full approval", value: normal }
      - { label: "Emergency - Expedited approval", value: emergency }
  - name: environment
    type: select
    label: Target Environment
    required: true
    options:
      - { label: Production, value: production }
      - { label: Staging, value: staging }
      - { label: Pre-production, value: pre-prod }
  - name: risk_level
    type: select
    label: Risk Level
    required: true
    options:
      - { label: "Low - No customer impact expected", value: low }
      - { label: "Medium - Potential minor disruption", value: medium }
      - { label: "High - Customer-facing impact likely", value: high }
      - { label: "Critical - Major outage risk", value: critical }
  - name: change_description
    type: textarea
    label: Change Description
    required: true
  - name: rollback_plan
    type: textarea
    label: Rollback Plan
    required: true
onSubmit: submit-change-request
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Change request logged. Now complete the pre-deployment checklist:

\`\`\`mdma
id: pre-deployment-checklist
type: tasklist
items:
  - id: ci-pipeline-green
    text: "CI/CD pipeline passing on all target branches"
    required: true
  - id: unit-tests-pass
    text: "Unit tests passing with adequate coverage (>80%)"
    required: true
  - id: integration-tests-pass
    text: "Integration tests passing in staging"
    required: true
  - id: security-scan
    text: "Security vulnerability scan completed (no critical/high)"
    required: true
  - id: monitoring-alerts
    text: "Monitoring dashboards and alerts configured"
    required: true
  - id: runbook-updated
    text: "Runbook updated with deployment and rollback steps"
    required: true
  - id: backup-verified
    text: "Database backup verified before deployment"
    required: true
  - id: rollback-tested
    text: "Rollback procedure tested in staging"
    required: true
\`\`\`

\`\`\`mdma
id: checklist-done-btn
type: button
text: Checklist Complete
variant: primary
onAction: checklist-done
\`\`\``,
      },
      {
        userMessage: '[Checklist completed]',
        markdown: `Pre-deployment verified. Now we need dual approval for SOX compliance:

\`\`\`mdma
id: tech-lead-approval
type: approval-gate
title: Tech Lead Sign-off
requiredApprovers: 1
allowedRoles:
  - tech-lead
  - staff-engineer
  - principal-engineer
\`\`\`

\`\`\`mdma
id: manager-approval
type: approval-gate
title: Engineering Manager Sign-off
requiredApprovers: 1
allowedRoles:
  - engineering-manager
  - director-engineering
  - vp-engineering
\`\`\`

Once both approvals are obtained, the change is authorized for deployment.`,
      },
    ],
  },

  'customer-escalation': {
    label: 'Customer Escalation',
    customPrompt: `You are a customer support escalation assistant that helps resolve high-priority customer issues with SLA tracking.

SLA windows: P1: 4 hours, P2: 8 hours, P3: 24 hours, P4: 72 hours. All escalations must be acknowledged within 1 hour.

The escalation flow has 3 steps:
1. Escalation Details — collect: Case/Ticket ID, Customer Name, Customer Email (sensitive), Account ID (sensitive), Priority (P1-P4 with SLA), Category (Billing/Outage/Feature/Privacy/Access/Legal/Other), Escalation Reason, Customer Sentiment (Satisfied/Frustrated/Angry/Threatening). Show SLA warning callout.
2. Resolution Steps — checklist: acknowledge within 1 hour, review case history, reproduce issue, identify root cause, propose resolution, implement fix, customer confirmation, close case.
3. Escalation actions — "Escalate to Manager" danger button and escalation history table.

Be empathetic and focused on resolution speed.`,
    steps: [
      {
        userMessage: 'I have a customer escalation that needs immediate attention',
        markdown: `# Customer Escalation

Let's document the escalation details:

\`\`\`mdma
id: sla-warning
type: callout
variant: warning
title: SLA Compliance Required
content: "All escalations must be acknowledged within 1 hour. SLA windows — P1: 4h, P2: 8h, P3: 24h, P4: 72h. Breaches trigger automatic manager notification."
\`\`\`

\`\`\`mdma
id: escalation-form
type: form
fields:
  - name: case_id
    type: text
    label: Case / Ticket ID
    required: true
  - name: customer_name
    type: text
    label: Customer Name
    required: true
  - name: customer_email
    type: email
    label: Customer Email
    required: true
    sensitive: true
  - name: account_id
    type: text
    label: Account ID
    required: true
    sensitive: true
  - name: priority
    type: select
    label: Escalation Priority
    required: true
    options:
      - { label: "P1 - Critical (SLA: 4h)", value: P1 }
      - { label: "P2 - High (SLA: 8h)", value: P2 }
      - { label: "P3 - Medium (SLA: 24h)", value: P3 }
      - { label: "P4 - Low (SLA: 72h)", value: P4 }
  - name: category
    type: select
    label: Escalation Category
    required: true
    options:
      - { label: "Billing / Charges Dispute", value: billing }
      - { label: "Service Outage", value: outage }
      - { label: "Data / Privacy Concern", value: privacy }
      - { label: "Account Access Issue", value: access }
      - { label: "Contract / Legal", value: legal }
  - name: customer_sentiment
    type: select
    label: Customer Sentiment
    required: true
    options:
      - { label: "Satisfied - Willing to wait", value: satisfied }
      - { label: "Frustrated - Needs prompt attention", value: frustrated }
      - { label: "Angry - At risk of churn", value: angry }
      - { label: "Threatening - Legal/social media threat", value: threatening }
  - name: escalation_reason
    type: textarea
    label: Escalation Reason
    required: true
onSubmit: submit-escalation
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Escalation logged. Work through the resolution steps:

\`\`\`mdma
id: resolution-steps
type: tasklist
items:
  - id: acknowledge-customer
    text: "Acknowledge escalation to customer within 1 hour"
    required: true
  - id: review-history
    text: "Review full case history and previous interactions"
    required: true
  - id: reproduce-issue
    text: "Reproduce or verify the reported issue"
  - id: identify-root-cause
    text: "Identify root cause or responsible team"
    required: true
  - id: propose-resolution
    text: "Propose resolution to customer"
    required: true
  - id: customer-confirmation
    text: "Obtain customer confirmation of resolution"
    required: true
  - id: close-case
    text: "Close case with resolution summary"
    required: true
\`\`\`

\`\`\`mdma
id: resolution-done-btn
type: button
text: Mark Resolution Complete
variant: primary
onAction: resolution-done
\`\`\``,
      },
      {
        userMessage: '[Resolution completed]',
        markdown: `Resolution steps completed. The case can now be closed or escalated further if needed.

\`\`\`mdma
id: resolution-success
type: callout
variant: success
title: Escalation Resolved
content: "All resolution steps completed. The case is ready to be archived for quality review."
\`\`\`

\`\`\`mdma
id: escalate-manager-btn
type: button
text: Escalate to Manager
variant: danger
onAction: escalate-to-manager
confirm:
  title: Escalate to Manager?
  message: "This will notify the support manager and mark this case as requiring management attention."
  confirmText: Escalate
  cancelText: Cancel
\`\`\``,
      },
    ],
  },

  'clinical-ops': {
    label: 'Clinical Procedure Approval',
    customPrompt: `You are a clinical operations assistant that manages procedure publish and change approvals for healthcare organizations.

All clinical procedures must undergo clinical review, QA review, and safety verification before publication. Patient safety is the top priority.

The clinical approval flow has 3 steps:
1. Procedure Metadata — show a critical safety callout (error variant). Collect: Procedure ID, Title, Change Type (New/Major Revision/Minor Revision/Retirement), Department (Surgery/Internal Medicine/Emergency/Radiology/Pharmacy/Nursing), Author Name & Credentials, Effective Date, Clinical Summary, Contraindications, Evidence References, Risk Category (Low/Medium/High/Critical).
2. Review Checklist — tasks: clinical accuracy, evidence-based guidelines, contraindications documented, drug interactions, equipment verified, competency requirements, patient consent, regulatory alignment, formatting standards, cross-references.
3. Dual Clinical Approval — Clinical Review (attending-physician/department-chief/medical-director) and QA Review (qa-specialist/qa-manager/chief-quality-officer).

Use formal medical language. Emphasize patient safety at every step.`,
    steps: [
      {
        userMessage: 'I need to submit a clinical procedure for review and approval',
        markdown: `# Clinical Procedure Approval

\`\`\`mdma
id: safety-notice
type: callout
variant: error
title: Patient Safety - Critical Review Required
content: "This procedure directly impacts patient care. All reviewers must verify clinical accuracy, contraindication documentation, and alignment with current evidence-based guidelines."
\`\`\`

Please provide the procedure details:

\`\`\`mdma
id: procedure-form
type: form
fields:
  - name: procedure_title
    type: text
    label: Procedure Title
    required: true
  - name: change_type
    type: select
    label: Change Type
    required: true
    options:
      - { label: New Procedure, value: new }
      - { label: Major Revision, value: major-revision }
      - { label: Minor Revision, value: minor-revision }
      - { label: Retirement, value: retirement }
  - name: department
    type: select
    label: Department
    required: true
    options:
      - { label: Surgery, value: surgery }
      - { label: Internal Medicine, value: internal-medicine }
      - { label: Emergency Medicine, value: emergency }
      - { label: Radiology, value: radiology }
      - { label: Pharmacy, value: pharmacy }
      - { label: Nursing, value: nursing }
  - name: author_credentials
    type: text
    label: Author Credentials (e.g., MD, RN, PharmD)
    required: true
  - name: risk_category
    type: select
    label: Risk Category
    required: true
    options:
      - { label: "Low - Minimal patient risk", value: low }
      - { label: "Medium - Moderate patient risk", value: medium }
      - { label: "High - Significant patient risk", value: high }
      - { label: "Critical - Life-threatening implications", value: critical }
  - name: clinical_summary
    type: textarea
    label: Clinical Summary
    required: true
  - name: contraindications
    type: textarea
    label: Contraindications and Warnings
    required: true
onSubmit: submit-procedure
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Procedure submitted. Complete the clinical review checklist:

\`\`\`mdma
id: review-checklist
type: tasklist
items:
  - id: clinical-accuracy
    text: "Clinical content reviewed for medical accuracy"
    required: true
  - id: evidence-based
    text: "Procedure aligns with current evidence-based guidelines"
    required: true
  - id: contraindications-complete
    text: "All known contraindications documented"
    required: true
  - id: drug-interactions
    text: "Drug interactions and allergies addressed (if applicable)"
  - id: equipment-verified
    text: "Required equipment and supplies listed and available"
    required: true
  - id: competency-requirements
    text: "Staff competency and training requirements defined"
    required: true
  - id: patient-consent
    text: "Patient consent requirements specified"
    required: true
  - id: regulatory-alignment
    text: "Regulatory and accreditation requirements verified"
    required: true
\`\`\`

\`\`\`mdma
id: review-done-btn
type: button
text: Review Checklist Complete
variant: primary
onAction: review-done
\`\`\``,
      },
      {
        userMessage: '[Review completed]',
        markdown: `Review checklist verified. The procedure now requires dual sign-off:

\`\`\`mdma
id: clinical-review
type: approval-gate
title: Clinical Review Sign-off
requiredApprovers: 1
allowedRoles:
  - attending-physician
  - department-chief
  - medical-director
\`\`\`

\`\`\`mdma
id: qa-review
type: approval-gate
title: Quality Assurance Review Sign-off
requiredApprovers: 1
allowedRoles:
  - qa-specialist
  - qa-manager
  - chief-quality-officer
\`\`\`

Once both approvals are obtained, the procedure is cleared for publication and staff notification.`,
      },
    ],
  },

  'kyc-case': {
    label: 'KYC Case Review',
    customPrompt: `You are a compliance assistant that manages KYC (Know Your Customer) and AML (Anti-Money Laundering) identity verification workflows.

The KYC flow has 3 steps:
1. Customer Information — collect: Case Reference ID, Customer Type (Individual/Business/Trust), Full Legal Name (sensitive), Date of Birth (sensitive), Nationality, SSN/Tax ID (sensitive), Email (sensitive), Phone (sensitive), Residential Address (sensitive), Source of Funds (Employment/Business/Investment/Inheritance/Other), Initial Risk Rating (Low/Medium/High/Prohibited).
2. Verification Checklist — tasks: government photo ID verified, proof of address (<3 months), sanctions screening (OFAC/EU/UN), PEP screening, adverse media screening, source of funds documentation, beneficial ownership (if business), risk assessment score, enhanced due diligence (if high-risk).
3. Compliance Approval — approval gate requiring compliance-officer/compliance-manager/chief-compliance-officer sign-off.

Mark ALL personal data fields as sensitive. Use formal compliance language.`,
    steps: [
      {
        userMessage: 'I need to process a KYC case for a new customer',
        markdown: `# KYC Case Review

Let's collect the customer's identity information:

\`\`\`mdma
id: customer-info-form
type: form
fields:
  - name: case_id
    type: text
    label: Case Reference ID
    required: true
  - name: customer_type
    type: select
    label: Customer Type
    required: true
    options:
      - { label: Individual, value: individual }
      - { label: Business Entity, value: business }
      - { label: "Trust / Foundation", value: trust }
  - name: full_name
    type: text
    label: Full Legal Name
    required: true
    sensitive: true
  - name: date_of_birth
    type: date
    label: Date of Birth
    required: true
    sensitive: true
  - name: ssn_or_tax_id
    type: text
    label: SSN / Tax Identification Number
    required: true
    sensitive: true
  - name: email
    type: email
    label: Email Address
    required: true
    sensitive: true
  - name: source_of_funds
    type: select
    label: Source of Funds
    required: true
    options:
      - { label: Employment Income, value: employment }
      - { label: Business Revenue, value: business }
      - { label: Investment Returns, value: investment }
      - { label: Inheritance, value: inheritance }
      - { label: Other, value: other }
  - name: risk_rating
    type: select
    label: Initial Risk Rating
    required: true
    options:
      - { label: Low Risk, value: low }
      - { label: Medium Risk, value: medium }
      - { label: High Risk, value: high }
      - { label: Prohibited, value: prohibited }
onSubmit: submit-customer-info
\`\`\``,
      },
      {
        userMessage: '[Form submitted]',
        markdown: `Customer information recorded. Complete the verification checklist:

\`\`\`mdma
id: verification-checklist
type: tasklist
items:
  - id: id-document-check
    text: "Government-issued photo ID verified (passport or national ID)"
    required: true
  - id: proof-of-address
    text: "Proof of address verified (utility bill or bank statement, < 3 months)"
    required: true
  - id: sanctions-screening
    text: "Sanctions list screening completed (OFAC, EU, UN)"
    required: true
  - id: pep-screening
    text: "Politically Exposed Person (PEP) screening completed"
    required: true
  - id: adverse-media
    text: "Adverse media screening completed"
  - id: source-of-funds
    text: "Source of funds documentation reviewed"
    required: true
  - id: risk-assessment
    text: "Risk assessment score calculated and documented"
    required: true
  - id: enhanced-due-diligence
    text: "Enhanced Due Diligence completed (if high-risk)"
\`\`\`

\`\`\`mdma
id: verification-done-btn
type: button
text: Verification Complete
variant: primary
onAction: verification-done
\`\`\``,
      },
      {
        userMessage: '[Verification completed]',
        markdown: `All verification steps completed. The case requires compliance officer sign-off:

\`\`\`mdma
id: compliance-approval
type: approval-gate
title: Compliance Officer Sign-off
requiredApprovers: 1
allowedRoles:
  - compliance-officer
  - compliance-manager
  - chief-compliance-officer
\`\`\`

Once approved, the KYC case is marked as verified and the customer is cleared for onboarding.`,
      },
    ],
  },
};
