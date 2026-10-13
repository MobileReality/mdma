import { Code } from '../Code.js';

export function CustomPromptBestPractices() {
  return (
    <>
      <h2>Custom Prompt Best Practices</h2>
      <p>
        When you pass a <code>customPrompt</code> to <code>buildSystemPrompt</code>, it sits
        alongside the MDMA author rules. The model treats both as authoritative, so wording choices
        in the custom prompt strongly influence the output — sometimes overriding MDMA rules. The
        patterns below are drawn from eval failures we&apos;ve fixed across the prompt matrix.
      </p>

      <h3>1. Frame multi-step workflows as turns, not single-message blueprints</h3>
      <p>
        When a workflow has several interactive components (form &rarr; approval-gate &rarr;
        button), describing them as &quot;always generate exactly these three components&quot;
        causes the model to emit all of them in one message — violating the
        one-interactive-component-per-response rule.
      </p>
      <p>
        Instead, describe the workflow as a sequence of turns. The model then emits only the first
        interactive component initially and treats the rest as follow-ups.
      </p>
      <div className="docs-do-dont">
        <div className="docs-dont">
          <h4>❌ Avoid</h4>
          <Code lang="bash">{`When the user submits an expense, always
generate exactly these three components:

\`\`\`mdma
type: form
id: expense-form
...
\`\`\`

\`\`\`mdma
type: approval-gate
id: expense-approval
...
\`\`\`

\`\`\`mdma
type: button
id: submit-expense
...
\`\`\`

Generate only these three components.`}</Code>
        </div>
        <div className="docs-do">
          <h4>✅ Prefer</h4>
          <Code lang="bash">{`The expense submission workflow has three turns:

Turn 1 — In the initial response, generate this
form to collect the expense details:

\`\`\`mdma
type: form
id: expense-form
...
onSubmit: approve-expense
\`\`\`

Turn 2 — After the user submits the form, the
next assistant message will present this
approval gate for manager sign-off:

\`\`\`mdma
type: approval-gate
...
\`\`\`

Turn 3 — Once the approval is in, the final
assistant message will offer this submit button.

For the initial response, generate only the
form. The approval gate and button are
follow-up steps and appear in later turns.`}</Code>
        </div>
      </div>

      <h3>2. Always specify an onSubmit handler for forms</h3>
      <p>
        The form schema requires <code>onSubmit</code>. When the custom prompt doesn&apos;t name
        one, the model either omits it (schema violation) or invents a self-referencing handler (
        <code>onSubmit: my-form</code> targets itself), both of which fail validation. Always give
        the form an explicit handler name in the prompt — it&apos;s an opaque string label, so it
        doesn&apos;t need to correspond to a real component.
      </p>
      <div className="docs-do-dont">
        <div className="docs-dont">
          <h4>❌ Avoid</h4>
          <Code lang="bash">{`Present a contact form with fields:
- Full Name (required)
- Email Address (required, sensitive)
- Message (required, min 10 chars)`}</Code>
        </div>
        <div className="docs-do">
          <h4>✅ Prefer</h4>
          <Code lang="bash">{`Present a contact form (with
\`onSubmit: contact-submitted\`) with fields:
- Full Name (required)
- Email Address (required, sensitive)
- Message (required, min 10 chars)`}</Code>
        </div>
      </div>

      <h3>3. Avoid special characters in field name descriptions</h3>
      <p>
        Slashes, ampersands, and parenthetical alternatives in field names confuse the YAML
        generation step. The model occasionally produces malformed YAML keys (e.g.{' '}
        <code>name:ssn-tax-id</code> instead of <code>name: ssn-tax-id</code>) when it tries to
        convert a compound label into a single field name.
      </p>
      <div className="docs-do-dont">
        <div className="docs-dont">
          <h4>❌ Avoid</h4>
          <Code lang="bash">{`Collect customer information:
- SSN / Tax ID (required, sensitive)
- Phone & Email (required, sensitive)`}</Code>
        </div>
        <div className="docs-do">
          <h4>✅ Prefer</h4>
          <Code lang="bash">{`Collect customer information:
- Tax Identifier (required, sensitive)
- Phone Number (required, sensitive)
- Email (required, sensitive)`}</Code>
        </div>
      </div>

      <h3>4. Don&apos;t materialize action-label targets as sibling components</h3>
      <p>
        Action-label fields like <code>onSubmit</code>, <code>onAction</code>,<code>onApprove</code>
        , <code>onDeny</code>, <code>trigger</code>, and
        <code>onComplete</code> are <em>opaque string labels</em> — they do not need to match any
        other component in the same message. A callout, webhook, or button with an <code>id</code>{' '}
        that matches another component&apos;s action label is a follow-up step, not a sibling.
      </p>
      <p>
        When your prompt includes such a follow-up component, describe it as part of a later turn
        (see pattern 1). Don&apos;t instruct the model to render the handler alongside the action
        that triggers it.
      </p>

      <h3>5. Single-interactive-component constraint</h3>
      <p>
        Every response contains at most one interactive component (<code>form</code>,{' '}
        <code>button</code>, <code>webhook</code>,<code>approval-gate</code>, <code>tasklist</code>
        ). Non-interactive components (<code>callout</code>, <code>chart</code>, <code>table</code>)
        are unaffected — you can emit as many as you need.
      </p>
      <p>
        Your custom prompt should respect this. If you describe a workflow that needs multiple
        interactive components (form + approval + button), structure it as turns (pattern 1) rather
        than asking for all of them at once.
      </p>

      <h3>6. Use the model-specific author prompt, not one prompt for every model</h3>
      <p>
        <code>AUTHOR_PROMPT_VARIANTS</code> holds one author prompt per model family, and{' '}
        <code>getAuthorPromptVariant(id)</code> returns the one you ask for (falling back to{' '}
        <code>default</code> for an unknown id). The demo maps each model to its variant in{' '}
        <code>getDefaultPromptVariantForModel</code>. Pass the variant&apos;s <code>prompt</code> as{' '}
        <code>authorPrompt</code> instead of sending the default prompt to every model.
      </p>
      <p>
        Variants differ only by short framing blocks added for failure modes that were measured on
        that model, composed from the shared blocks of the vendor folder rather than copied whole:
      </p>
      <ul className="docs-list">
        <li>
          <code>&lt;scope_discipline&gt;</code> and <code>&lt;fence_closing&gt;</code> — stop
          unrequested components and unclosed <code>```mdma</code> fences. Claude Sonnet 5.5 uses
          both.
        </li>
        <li>
          An &quot;emit the component&quot; block — Gemini flash-tier models (Gemini 3.5, 3.7 and
          3.8 Flash share it) can describe the component in prose in multi-turn flows instead of
          writing the block.
        </li>
        <li>
          <code>&lt;no_unrequested_extras&gt;</code> — Claude Opus 5 wrapped a single requested
          component in an unsolicited callout in 1 run of 8, so only that variant carries the block.
        </li>
      </ul>
      <p>
        Add a block only when you have seen the failure. A block added speculatively costs tokens
        and can regress other cases.
      </p>
      <div className="docs-do-dont">
        <div className="docs-dont">
          <h4>❌ Avoid</h4>
          <Code lang="typescript">{`const authorPrompt = getAuthorPromptVariant('default').prompt;
// same prompt for every model`}</Code>
        </div>
        <div className="docs-do">
          <h4>✅ Prefer</h4>
          <Code lang="typescript">{`const { prompt } = getAuthorPromptVariant('anthropic/opus-5');
const system = buildSystemPrompt({ authorPrompt: prompt });`}</Code>
        </div>
      </div>

      <h3>7. Don&apos;t call the thinking component &quot;reasoning&quot; for Claude Sonnet 5.5</h3>
      <p>
        When a system prompt asks Claude Sonnet 5.5 to write out its reasoning, Anthropic&apos;s
        classifier can answer with <code>stop_reason: refusal</code> (category{' '}
        <code>reasoning_extraction</code>). Describing the <code>thinking</code> component as
        &quot;AI reasoning&quot; produced refusals for 7 of 20 benign requests on Anthropic&apos;s
        API. Describing it as a short plan summary took that to 0 of 20. Through OpenRouter the
        refusal surfaces as <code>finish_reason: content_filter</code>.
      </p>
      <div className="docs-do-dont">
        <div className="docs-dont">
          <h4>❌ Avoid</h4>
          <Code lang="bash">{`thinking: AI reasoning or thinking process.
Show your reasoning process in content.`}</Code>
        </div>
        <div className="docs-do">
          <h4>✅ Prefer</h4>
          <Code lang="bash">{`thinking: a short plan summary - what the
document below contains and how it is
structured.`}</Code>
        </div>
      </div>
      <p>
        The <code>anthropic/sonnet-5.5</code> variant already uses the second wording. Some
        OpenRouter upstreams still return <code>content_filter</code> for this model, so pin the
        provider to Anthropic or call the Anthropic API directly.
      </p>

      <h3>8. Evaluate through the path you ship</h3>
      <ul className="docs-list">
        <li>
          The same prompt gave different results through OpenRouter&apos;s default routing than on
          Anthropic&apos;s own API. Measure with the provider and routing production will use.
        </li>
        <li>
          promptfoo prepends the response&apos;s separate <code>reasoning</code> field to the output
          as a &quot;Thinking: ...&quot; preamble. A raw API call does not show it. Don&apos;t try
          to remove it with prompt text: a &quot;Response Start&quot; block tried on Gemini 3.7
          Flash changed nothing (pass rate 93 or 94 of 95 cases either way).
        </li>
        <li>
          For Claude models use <code>evals/providers/anthropic-direct.mjs</code>. It sends no{' '}
          <code>temperature</code> (newer models reject it) and reports a <code>refusal</code> stop
          reason as an error, so a safety refusal is not scored as a prompt failure.
        </li>
        <li>
          One run per flagship model is enough. Repeat runs only for flaky small models, where a
          single pass can mislead.
        </li>
      </ul>

      <h3>9. External data sources: give definitions, never data</h3>
      <p>
        Pass <code>dataSources</code> to <code>buildSystemPrompt</code> and the model sees a catalog
        of names, kinds, descriptions, columns and params (with <code>allowed</code> values). It
        must reference data as <code>{'{ source, params }'}</code> and not write rows, options or
        CSV itself. Keep your own prompt consistent with that:
      </p>
      <ul className="docs-list">
        <li>Describe sources by definition. Never paste rows or sample values into the prompt.</li>
        <li>
          When the same data should be offered as a table and as a chart, declare two sources: a{' '}
          <code>rows</code> source for <code>table.data</code> and a <code>series</code> source for{' '}
          <code>chart.data</code>. <code>options</code> sources feed <code>form</code> select
          fields.
        </li>
        <li>
          Write descriptions that say what each source is for (&quot;use it for tables&quot;). The
          model picks by description.
        </li>
        <li>
          Let the model say a request cannot be served. The catalog rules already tell it not to
          fabricate data when no source fits; don&apos;t add instructions that demand a component
          anyway.
        </li>
        <li>
          Without a fitting source in the catalog a model may try the wrong kind, and the repair
          step may then change the component type to match it.
        </li>
      </ul>
      <div className="docs-do-dont">
        <div className="docs-dont">
          <h4>❌ Avoid</h4>
          <Code lang="bash">{`Show open incidents as a table:
| INC-1 | Printer down | open |
| INC-2 | VPN slow     | open |`}</Code>
        </div>
        <div className="docs-do">
          <h4>✅ Prefer</h4>
          <Code lang="typescript">{`dataSources: [
  {
    name: 'incidents',
    kind: 'rows',
    description: 'Incident list. Use it for tables.',
    columns: [
      { key: 'title', type: 'string' },
      { key: 'status', type: 'string' },
    ],
    params: [
      { name: 'status', type: 'string',
        allowed: ['open', 'closed'] },
    ],
  },
]`}</Code>
        </div>
      </div>
      <p>The model should then write only the reference:</p>
      <Code lang="bash">{`\`\`\`mdma
type: table
id: open-incidents
columns:
  - key: title
    header: Title
data:
  source: incidents
  params: { status: open }
\`\`\``}</Code>

      <h3>10. Give the fixer the same catalog</h3>
      <p>
        The fixer repairs a document the validator rejected. If it does not see the catalog it can
        &quot;fix&quot; a bad reference by inventing a source or pasting inline rows. Pass the same{' '}
        <code>dataSources</code> to <code>buildFixerMessage</code> so repairs stay inside the
        catalog: it then renders the catalog into the message, and the fixer prompt tells the model
        to use only listed sources, params and columns and never to replace a reference with inline
        data.
      </p>
      <Code lang="typescript">
        {'const message = buildFixerMessage(markdown, issues, { dataSources });'}
      </Code>

      <h3>Quick checklist</h3>
      <ul className="docs-list">
        <li>
          Multi-step workflows are described as &quot;Turn 1 / Turn 2 / Turn 3&quot;, not as a
          single batch.
        </li>
        <li>
          Every form has an explicit <code>onSubmit</code> handler in the prompt.
        </li>
        <li>Field labels avoid slashes, ampersands, and parenthetical alternatives.</li>
        <li>Follow-up callouts/webhooks/buttons are described as future turns, not siblings.</li>
        <li>The initial response emits only one interactive component.</li>
        <li>
          The author prompt comes from <code>getAuthorPromptVariant</code> for the model in use;
          framing blocks exist only for measured failures.
        </li>
        <li>
          For Claude Sonnet 5.5, <code>thinking</code> is a plan summary, never
          &quot;reasoning&quot;, and the provider is pinned to Anthropic.
        </li>
        <li>Evals run through the shipped provider path, one run per flagship model.</li>
        <li>
          Data sources are definitions only, with a <code>rows</code> and a <code>series</code>{' '}
          source when data feeds both tables and charts.
        </li>
        <li>
          <code>buildFixerMessage</code> receives the same <code>dataSources</code> as{' '}
          <code>buildSystemPrompt</code>.
        </li>
      </ul>
    </>
  );
}
