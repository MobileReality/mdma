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
      </ul>
    </>
  );
}
