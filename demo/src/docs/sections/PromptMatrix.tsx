import { Table } from '../Table.js';

export function PromptMatrix() {
  return (
    <>
      <h2>MDMA_AUTHOR Prompt Matrix</h2>
      <p>
        Each cell shows the pass rate of the model-specialized <code>MDMA_AUTHOR</code> prompt
        variant on the listed eval suite.
      </p>
      <p>✅ 100% &nbsp; 🟡 80–99% &nbsp; 🔴 Below 80%</p>
      <Table
        headers={['Variant', 'one-shot', 'one-shot custom', 'conversation', 'specific flow']}
        rows={[
          ['gpt-5.5', '✅', '✅', '✅', '✅'],
          ['gpt-5.4', '✅', '🟡 †', '🟡 †', '🟡 †'],
          ['gpt-5.4-mini', '✅', '✅', '✅ *', '✅ *'],
          ['gpt-5.4-nano', '✅', '✅', '✅ *', '✅ *'],
          ['gpt-5.2', '✅', '✅', '✅', '✅'],
          ['gpt-5.1', '✅', '✅', '✅', '✅'],
          ['gpt-5 [i]', '✅', '✅', '✅', '✅'],
          ['gpt-5-mini [i]', '✅', '✅', '✅ *', '✅ *'],
          ['gpt-4.1', '✅', '✅', '✅', '✅'],
          ['gpt-4.1-mini', '✅', '✅', '✅ *', '✅ *'],
          ['gpt-4.1-nano', '🟡', '✅', '✅ *', '✅ *'],
          ['claude-opus-4.7', '✅', '✅', '✅', '✅'],
          ['claude-opus-4.6', '✅', '✅', '✅', '✅'],
          ['claude-sonnet-4.6', '✅', '✅', '✅', '✅'],
          ['claude-haiku-4.5', '✅', '✅', '✅ *', '✅ *'],
          ['gemini-3.1-pro-preview', '✅', '✅', '✅', '🟡 ‡'],
          ['gemini-3.1-pro-preview-customtools', '✅', '✅', '✅', '✅'],
          ['gemini-3.1-flash-lite-preview', '✅', '✅', '✅ *', '✅ *'],
          ['gemini-3-flash-preview', '✅', '✅', '✅ *', '✅ *'],
          ['gemini-2.5-pro', '✅', '✅', '✅', '✅'],
          ['gemini-2.5-flash', '✅', '✅', '✅ *', '✅ *'],
          ['gemini-2.5-flash-lite', '🟡', '✅', '✅ *', '✅ *'],
          ['grok-4.3 [i]', '🟡', '🔴', '🔴', '🔴'],
          ['grok-4.20', '✅', '✅', '✅', '✅'],
        ]}
      />
      <p className="docs-note">
        * Smaller/lower-tier models pass eval suites but may hallucinate or drift from the spec in
        longer real-world conversations. Prefer flagship-tier models for production multi-turn
        flows.
      </p>
      <p className="docs-note">
        [i] Noticeably slow response times — single-turn responses commonly take tens of seconds.
      </p>
      <p className="docs-note">
        † <strong>gpt-5.4 intermittent duplication bug</strong> — passes one-shot evals reliably
        but shows non-deterministic output duplication in multi-turn, custom-prompt, and flow evals
        (~7–15% of runs). The model generates a correct response then immediately re-emits it
        verbatim, causing <code>[duplicate-ids]</code> validation errors. This is a known
        model-level issue unrelated to the prompt variant.{' '}
        <a
          href="https://community.openai.com/t/seeing-intermittent-duplicate-strings-in-gpt-5-4-responses/1376651"
          target="_blank"
          rel="noreferrer"
        >
          See OpenAI community thread.
        </a>{' '}
        Prefer <code>gpt-5.5</code> or <code>gpt-5.2</code> for production use.
      </p>
      <p className="docs-note">
        ‡ <strong>gemini-3.1-pro-preview stochastic preamble loop</strong> — on ~7–15% of flow-eval
        runs, the model emits a chain-of-thought as visible Markdown prose ("
        <code>**Investigating Production Errors**</code>" repeated 3–5 times) instead of opening a{' '}
        <code>```mdma</code> block, producing either{' '}
        <code>[yaml-correctness: outside fenced block]</code> or{' '}
        <code>[duplicate-ids]</code> errors. Per Google's official Gemini 3 prompting guide, this
        is a model-level behavior driven by temperature/sampling choices — prompt-level fixes shift
        which test loops rather than eliminating the loops. Prefer <code>gemini-2.5-pro</code> for
        production multi-step flows requiring deterministic output.
      </p>

      <h2>MDMA_AGENT Prompt Matrix</h2>
      <p>
        Each cell shows whether the model correctly decides to call the <code>generate_mdma</code>{' '}
        tool — calling it when the user needs a structured component, and skipping it for plain
        conversational replies.
      </p>
      <p>✅ 100% &nbsp; 🟡 80–99% &nbsp; 🔴 Below 80% &nbsp; — Not yet evaluated</p>
      <Table
        headers={['Variant', 'calls when needed', 'skips when not needed', 'multi-turn']}
        rows={[
          ['gpt-5.5', '✅', '✅', '✅'],
          ['gpt-5.4', '✅', '✅', '✅'],
          ['gpt-5.4-mini', '✅', '✅', '🟡'],
          ['gpt-5.4-nano', '—', '—', '—'],
          ['gpt-5.2', '✅', '✅', '✅'],
          ['gpt-5.1', '✅', '✅', '✅'],
          ['gpt-5 [i]', '✅', '✅', '✅'],
          ['gpt-5-mini [i]', '✅', '✅', '🟡'],
          ['gpt-4.1', '—', '—', '—'],
          ['gpt-4.1-mini', '—', '—', '—'],
          ['gpt-4.1-nano', '—', '—', '—'],
          ['claude-opus-4.7', '✅', '✅', '✅'],
          ['claude-opus-4.6', '✅', '✅', '✅'],
          ['claude-sonnet-4.6', '✅', '✅', '✅'],
          ['claude-haiku-4.5', '✅', '✅', '🟡'],
          ['gemini-3.1-pro-preview', '✅', '✅', '✅'],
          ['gemini-3.1-pro-preview-customtools', '✅', '✅', '✅'],
          ['gemini-3.1-flash-lite-preview', '✅', '✅', '🟡'],
          ['gemini-3-flash-preview', '✅', '✅', '🟡'],
          ['gemini-2.5-pro', '✅', '✅', '✅'],
          ['gemini-2.5-flash', '—', '—', '—'],
          ['gemini-2.5-flash-lite', '—', '—', '—'],
          ['grok-4.3 [i]', '🟡', '🔴', '🔴'],
          ['grok-4.20', '✅', '✅', '✅'],
        ]}
      />
      <p className="docs-note">
        [i] Noticeably slow response times — single-turn responses commonly take tens of seconds.
      </p>
      <p className="docs-note">— Full eval data is being collected for these variants.</p>

      <h2>In Progress</h2>
      <p>
        The following prompts exist in <code>mdma-prompt-pack</code> but are still being optimized —
        they do not yet have model-specific variants for GPT, Claude, Gemini, or Grok.
      </p>
      <div className="docs-inprogress-list">
        {[
          { name: 'MDMA_FIXER', description: 'Corrects invalid or malformed MDMA documents.' },
          {
            name: 'MDMA_REVIEWER',
            description: 'Reviews and critiques MDMA documents for quality and spec conformance.',
          },
        ].map(({ name, description }) => (
          <div key={name} className="docs-inprogress-item">
            <span className="docs-inprogress-name">{name}</span>
            <span className="docs-inprogress-desc">{description}</span>
            <span className="docs-inprogress-badge">In Progress</span>
          </div>
        ))}
      </div>
    </>
  );
}
