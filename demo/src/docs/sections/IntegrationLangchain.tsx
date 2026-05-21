import { Code } from '../Code.js';

export function IntegrationLangchain() {
  return (
    <>
      <h2>LangChain.js</h2>
      <p>
        MDMA is framework-agnostic — it doesn't care how you call the LLM. LangChain.js works out of
        the box: use <code>mdma-prompt-pack</code> for the system prompt and <code>remarkMdma</code>{' '}
        from <code>mdma-parser</code> with a standard <code>unified</code> pipeline to process the
        output.
      </p>

      <h3>Install</h3>
      <Code lang="bash">
        {
          'npm install @langchain/anthropic @langchain/core unified remark-parse @mobile-reality/mdma-prompt-pack @mobile-reality/mdma-parser'
        }
      </Code>

      <h3>Simple completion (MDMA_AUTHOR)</h3>
      <Code lang="ts">{`import { ChatAnthropic } from '@langchain/anthropic';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AUTHOR_PROMPT_VARIANTS } from '@mobile-reality/mdma-prompt-pack';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

async function parseMarkdown(markdown: string) {
  const processor = unified().use(remarkParse).use(remarkMdma, {});
  const tree = processor.parse(markdown);
  return processor.run(tree);
}

const variant = AUTHOR_PROMPT_VARIANTS.find((v) => v.id === 'anthropic/sonnet');

const model = new ChatAnthropic({ model: 'claude-sonnet-4-6' });

const response = await model.invoke([
  new SystemMessage(variant.prompt),
  new HumanMessage('Create a contact form with name, email, and message fields.'),
]);

const ast = await parseMarkdown(response.content as string);
const components = ast.children.filter((n) => n.type === 'mdma');
// components → validated MDMA nodes, ready for mdma-renderer-react`}</Code>

      <h3>Picking a prompt variant</h3>
      <p>
        <code>AUTHOR_PROMPT_VARIANTS</code> contains a model-specific prompt for each supported
        model. Find the one that matches your model:
      </p>
      <Code lang="ts">{`import { AUTHOR_PROMPT_VARIANTS } from '@mobile-reality/mdma-prompt-pack';

// List all available variant IDs
console.log(AUTHOR_PROMPT_VARIANTS.map((v) => v.id));
// e.g. ['default', 'anthropic/haiku', 'anthropic/sonnet', 'openai/gpt-5.5', ...]

const variant = AUTHOR_PROMPT_VARIANTS.find((v) => v.id === 'anthropic/sonnet');`}</Code>

      <h3>Agentic tool calling (MDMA_AGENT)</h3>
      <p>
        Add <code>generate_mdma</code> as one of your agent's tools. The agent decides when to call
        it alongside any other tools you define.
      </p>
      <Code lang="ts">{`import { tool } from '@langchain/core/tools';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { AGENT_PROMPT_VARIANTS } from '@mobile-reality/mdma-prompt-pack';

const generateMdma = tool(
  async ({ document }) => {
    const ast = await parseMarkdown(document);
    return JSON.stringify(ast);
  },
  {
    name: 'generate_mdma',
    description: 'Render an interactive MDMA document for the user',
    schema: z.object({
      document: z.string().describe('Full MDMA markdown document'),
    }),
  }
);

const agentVariant = AGENT_PROMPT_VARIANTS.find((v) => v.id === 'anthropic/sonnet');

const agent = createToolCallingAgent({
  llm: model,
  tools: [generateMdma, ...yourOtherTools],
  prompt: ChatPromptTemplate.fromMessages([
    ['system', agentVariant.prompt],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]),
});

const executor = new AgentExecutor({ agent, tools: [generateMdma, ...yourOtherTools] });
const result = await executor.invoke({ input: 'I need a project status report form' });`}</Code>

      <h3>Python LangChain</h3>
      <p>
        The prompt-pack is a TypeScript package. For Python, copy the prompt string from the package
        source or expose it via a small JS service, then use it as the system message in any Python
        LangChain chain.
      </p>
      <Code lang="python">{`from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

# Copy the prompt string from mdma-prompt-pack or serve it from a JS endpoint
MDMA_SYSTEM_PROMPT = "..."

model = ChatAnthropic(model="claude-sonnet-4-6")

response = model.invoke([
    SystemMessage(content=MDMA_SYSTEM_PROMPT),
    HumanMessage(content="Create a contact form with name, email, and message."),
])

# response.content is an MDMA markdown string
# pass it to your frontend or a JS service running mdma-parser`}</Code>
    </>
  );
}
