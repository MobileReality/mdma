/**
 * The scored corpus: 6 component families x 3 variants = 18 prompts.
 *
 * Every prompt is expressible natively in all four formats under test. Prompts
 * asking for nested layout (which MDMA cannot express by design) and prompts
 * asking for approval gates / webhooks / PII flags (which the other three
 * cannot express) are deliberately excluded — see EXCLUDED_ASYMMETRIC below.
 *
 * These are USER messages only. The system message is separate and is each
 * format's own published prompt, which does describe its output format in full
 * — that is the artifact under test. The rules below therefore apply to the
 * user side, where a stray format hint would hand one format a head start.
 *
 * Rules for writing prompts here:
 *  - plain natural language, the way a product user would ask
 *  - NO format hints: never mention YAML, JSON, a DSL, or a component type name
 *    that belongs to any one format's catalog
 *  - byte-identical text is sent to every format and every model
 */

export type Family = 'contact-form' | 'data-table' | 'chart' | 'callout' | 'button' | 'tasklist';

/**
 * `minimal`     — plainest possible ask; the baseline that separates
 *                 "fails hard cases" from "fails everything"
 * `realistic`   — a real domain with more fields/columns/rows
 * `adversarial` — vague or over-specified wording that tempts the model out of
 *                 format; this is where the formats actually separate
 */
export type Variant = 'minimal' | 'realistic' | 'adversarial';

export interface Scenario {
  id: string;
  family: Family;
  variant: Variant;
  /** The user message. Sent verbatim, identically, to every format+model. */
  prompt: string;
  /**
   * What a correct answer must contain, in format-neutral terms. Used by the
   * report to explain failures — NOT used to pass/fail, since the headline
   * metric is renderability, not semantic fidelity.
   */
  expects: string;
}

export const SCENARIOS: Scenario[] = [
  // ---------------------------------------------------------------- forms
  {
    id: 'contact-form/minimal',
    family: 'contact-form',
    variant: 'minimal',
    prompt: 'Give me a contact form with name, email and message.',
    expects: 'a form with 3 fields (text, email, long text) and a submit action',
  },
  {
    id: 'contact-form/realistic',
    family: 'contact-form',
    variant: 'realistic',
    prompt:
      'I run a dental clinic. Build the appointment request form patients fill in on our website: their full name, phone number, email, which treatment they want (checkup, cleaning, whitening, or root canal), their preferred date, and a box for anything else they want us to know. Name, phone and treatment are the ones we cannot do without.',
    expects:
      'a form with 6 fields including a single-choice field with 4 options, a date field, and 3 fields marked required',
  },
  {
    id: 'contact-form/adversarial',
    family: 'contact-form',
    variant: 'adversarial',
    prompt:
      'We need something for gathering feedback. Not sure exactly what — maybe how happy they were, some way to say what went wrong, and how to reach them if they want a reply. Keep it short, nobody fills in long forms. Oh and it should look good on mobile.',
    expects:
      'a short form; the vague framing and the styling aside ("look good on mobile") should not derail the output format',
  },

  // --------------------------------------------------------------- tables
  {
    id: 'data-table/minimal',
    family: 'data-table',
    variant: 'minimal',
    prompt: 'Show me a table of the three largest countries by area.',
    expects: 'a table with ~2-3 columns and 3 rows',
  },
  {
    id: 'data-table/realistic',
    family: 'data-table',
    variant: 'realistic',
    prompt:
      'Show our Q3 sales team results as a table: rep name, region, deals closed, revenue, and how they did against quota. Eight reps across EMEA and APAC. Make the numbers realistic for a mid-size software company.',
    expects: 'a table with 5 columns and 8 rows of plausible invented data',
  },
  {
    id: 'data-table/adversarial',
    family: 'data-table',
    variant: 'adversarial',
    prompt:
      'Compare the top 5 cloud providers. I want every spec you can think of — pricing, regions, uptime, compliance, support tiers, cold start times, free tier, egress fees, the lot. Sort by whichever you think is most useful and tell me which one you would pick and why.',
    expects:
      'a wide table plus a recommendation; the "tell me which you would pick and why" is the trap — prose must not break the format',
  },

  // --------------------------------------------------------------- charts
  {
    id: 'chart/minimal',
    family: 'chart',
    variant: 'minimal',
    prompt: 'Chart our monthly revenue for the last 6 months as a bar chart.',
    expects: 'a bar chart with 6 labelled data points',
  },
  {
    id: 'chart/realistic',
    family: 'chart',
    variant: 'realistic',
    prompt:
      'Break down where our website traffic came from last month — organic search, paid ads, social, direct, and referrals — as a pie chart, with the percentages adding up properly.',
    expects: 'a pie chart with 5 slices summing to 100',
  },
  {
    id: 'chart/adversarial',
    family: 'chart',
    variant: 'adversarial',
    prompt:
      'Visualise this however makes most sense: Jan 4200, Feb 3800, Mar 5100, Apr 4900, May 6300, Jun 7100, Jul 6800. Actually put the raw numbers somewhere too so I can check them.',
    expects:
      'a chart of 7 points, plus the raw values; "however makes most sense" invites free-form output',
  },

  // -------------------------------------------------------------- callout
  {
    id: 'callout/minimal',
    family: 'callout',
    variant: 'minimal',
    prompt: 'Warn the user that their trial expires in 3 days.',
    expects: 'a single notice with a warning severity',
  },
  {
    id: 'callout/realistic',
    family: 'callout',
    variant: 'realistic',
    prompt:
      'We are doing scheduled maintenance this Sunday 02:00-06:00 UTC. Payments and exports will be unavailable, everything else keeps working. Let customers know, and be clear it is planned rather than an outage.',
    expects: 'an informational notice, not an error-severity one',
  },
  {
    id: 'callout/adversarial',
    family: 'callout',
    variant: 'adversarial',
    prompt:
      'Tell them it failed. Make it obvious. Actually make it really obvious — red, big, impossible to miss, maybe flashing.',
    expects:
      'an error notice; the styling demands (red, big, flashing) cannot be honoured by any of these formats and must not push the model into raw HTML/CSS',
  },

  // --------------------------------------------------------------- button
  {
    id: 'button/minimal',
    family: 'button',
    variant: 'minimal',
    prompt: 'Add a button that lets the user download their invoice.',
    expects: 'one button with a label and a named action',
  },
  {
    id: 'button/realistic',
    family: 'button',
    variant: 'realistic',
    prompt:
      'At the end of the subscription page, give the customer the two things they can do next: upgrade to the annual plan, or cancel their subscription. Make it clear which one is the destructive choice.',
    expects: 'two buttons with distinct actions and differentiated emphasis',
  },
  {
    id: 'button/adversarial',
    family: 'button',
    variant: 'adversarial',
    prompt:
      'Just a button. Do not add anything else at all, no heading, no explanation, no wrapper, nothing. Only the button.',
    expects:
      'exactly one button; the "nothing else" instruction conflicts with formats that require a root/wrapper element',
  },

  // ------------------------------------------------------------- tasklist
  {
    id: 'tasklist/minimal',
    family: 'tasklist',
    variant: 'minimal',
    prompt: 'Give me a checklist for setting up a new laptop.',
    expects: 'an ordered list of actionable steps',
  },
  {
    id: 'tasklist/realistic',
    family: 'tasklist',
    variant: 'realistic',
    prompt:
      'Walk a new hire through their first-day IT onboarding as a checklist they can tick off: account activation, password manager, VPN, 2FA, laptop encryption check, and getting added to the right team channels. Seven or eight steps.',
    expects: 'a checklist of 7-8 completable steps',
  },
  {
    id: 'tasklist/adversarial',
    family: 'tasklist',
    variant: 'adversarial',
    prompt:
      'Steps to deploy. And after each step explain in detail why it matters, what happens if you skip it, and include the exact commands to run.',
    expects:
      'steps with substantial prose and code per item — the trap is code fences and long prose escaping the structured format',
  },
];

/**
 * Documented and NOT run. Listed so the report can state precisely what was
 * excluded and why, rather than leaving readers to wonder.
 */
export const EXCLUDED_ASYMMETRIC = [
  {
    prompt: 'A pricing page with three plan cards side by side.',
    reason:
      'nested layout — json-render / OpenUI / AGenUI express this natively; MDMA has no Row/Column primitive by design (layout comes from the surrounding Markdown)',
    favours: 'the other three',
  },
  {
    prompt: 'A dashboard with a 2x2 grid of metric cards.',
    reason: 'nested layout — same asymmetry as above',
    favours: 'the other three',
  },
  {
    prompt: 'A refund form where the amount needs manager approval before it is submitted.',
    reason:
      'approval gate — MDMA has a first-class approval-gate component; the other three have no equivalent',
    favours: 'MDMA',
  },
  {
    prompt: 'A patient intake form that flags which fields hold personal medical data.',
    reason:
      'PII flagging — MDMA has `sensitive: true` on fields; the other three have no equivalent',
    favours: 'MDMA',
  },
  {
    prompt: 'A form that posts to our CRM endpoint when submitted.',
    reason: 'webhook — MDMA has a webhook component; the other three have no equivalent',
    favours: 'MDMA',
  },
] as const;

export const FAMILIES: Family[] = [
  'contact-form',
  'data-table',
  'chart',
  'callout',
  'button',
  'tasklist',
];

export const VARIANTS: Variant[] = ['minimal', 'realistic', 'adversarial'];
