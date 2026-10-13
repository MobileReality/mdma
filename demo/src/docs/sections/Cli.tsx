import { Code } from '../Code.js';

export function Cli() {
  return (
    <>
      <h2>CLI</h2>
      <p>Interactive prompt builder for creating custom MDMA prompts.</p>
      <Code lang="bash">{`# Run the prompt builder — opens a web app in your browser
npx @mobile-reality/mdma-cli

# Validate MDMA documents
npx @mobile-reality/mdma-cli validate "docs/**/*.md"
npx @mobile-reality/mdma-cli validate "docs/**/*.md" --fix   # auto-fix issues
npx @mobile-reality/mdma-cli validate "docs/**/*.md" --json  # JSON output

# Check { source, params } refs against a catalog of external data sources
npx @mobile-reality/mdma-cli validate "docs/**/*.md" --data-sources ./data-sources.json

# Print the system prompt, including the data source catalog
npx @mobile-reality/mdma-cli prompt --data-sources ./data-sources.json`}</Code>
      <p>
        The catalog file is a JSON array of data source definitions without <code>resolve</code>:
        the descriptors you register on the store (<code>name</code>, <code>kind</code>,{' '}
        <code>columns</code>, <code>params</code>). A <code>kind</code> of <code>rows</code> feeds{' '}
        <code>table.data</code>, <code>series</code> feeds <code>chart.data</code>, and{' '}
        <code>options</code> feeds a form select's <code>options</code>. Both commands print this
        shape under <code>--help</code>.
      </p>
      <Code lang="json">{`[
  {
    "name": "incidents",
    "kind": "rows",
    "columns": [{ "key": "title", "type": "string" }],
    "params": [{ "name": "status", "type": "string", "required": true }]
  }
]`}</Code>

      <p>The prompt builder walks you through:</p>
      <ol className="docs-list">
        <li>
          <strong>Pick components</strong> — select from the MDMA component types the builder offers
        </li>
        <li>
          <strong>Configure</strong> — define fields, options, roles, sensitive flags, and business
          rules
        </li>
        <li>
          <strong>Set triggers</strong> — specify when the AI should generate MDMA components
        </li>
        <li>
          <strong>Generate</strong> — an LLM creates a tailored <code>customPrompt</code>
        </li>
        <li>
          <strong>Export</strong> — copy the result and use it in your app
        </li>
      </ol>

      <Code lang="ts">{`import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';

const systemPrompt = buildSystemPrompt({
  customPrompt: '<paste generated prompt here>',
});`}</Code>

      <p>
        The prompt that drives the generation, <code>MASTER_PROMPT</code>, also ships
        model-specialised variants you can import to run the generation yourself:{' '}
        <code>
          @mobile-reality/mdma-cli/prompts/anthropic/&#123;haiku,sonnet,sonnet-5.5,opus&#125;
        </code>{' '}
        and <code>@mobile-reality/mdma-cli/prompts/google/gemma</code>. Claude Sonnet 5.5 has its
        own variant because it refuses system prompts that ask it to write out its reasoning, so
        there the <code>thinking</code> component is described as a plan summary. Other models,
        including GPT, Gemini and Grok, use the default <code>MASTER_PROMPT</code>.
      </p>
    </>
  );
}
