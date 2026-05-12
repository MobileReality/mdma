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
npx @mobile-reality/mdma-cli validate "docs/**/*.md" --json  # JSON output`}</Code>

      <p>The prompt builder walks you through:</p>
      <ol className="docs-list">
        <li><strong>Pick components</strong> — select from the 9 MDMA types</li>
        <li><strong>Configure</strong> — define fields, options, roles, sensitive flags, and business rules</li>
        <li><strong>Set triggers</strong> — specify when the AI should generate MDMA components</li>
        <li><strong>Generate</strong> — an LLM creates a tailored <code>customPrompt</code></li>
        <li><strong>Export</strong> — copy the result and use it in your app</li>
      </ol>

      <Code lang="ts">{`import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';

const systemPrompt = buildSystemPrompt({
  customPrompt: '<paste generated prompt here>',
});`}</Code>
    </>
  );
}
