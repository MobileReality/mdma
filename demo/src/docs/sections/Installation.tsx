import { Code } from '../Code.js';

export function Installation() {
  return (
    <>
      <h2>Installation</h2>
      <Code lang="bash">{`# Core — parse and run MDMA documents
npm install @mobile-reality/mdma-parser @mobile-reality/mdma-runtime

# React rendering
npm install @mobile-reality/mdma-renderer-react

# AI authoring — system prompts for LLM-based generation
npm install @mobile-reality/mdma-prompt-pack

# Validation — static analysis for MDMA documents
npm install @mobile-reality/mdma-validator

# CLI — interactive prompt builder + document validation
npx @mobile-reality/mdma-cli`}</Code>
      <p>All packages are published under the <code>@mobile-reality</code> npm org.</p>
    </>
  );
}
