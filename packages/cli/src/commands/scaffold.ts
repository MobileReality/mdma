import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

const ATTACHABLE_TEMPLATE = `import { z } from 'zod';
import { ComponentBaseSchema } from '@mdma/spec';
import type { AttachableHandler, ComponentState, AttachableContext } from '@mdma/runtime';

export const MyComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('my-component'),
  // Add your component-specific properties here
  title: z.string().min(1),
});

export type MyComponent = z.infer<typeof MyComponentSchema>;

export const myComponentHandler: AttachableHandler = {
  definition: {
    type: 'my-component',
    schema: MyComponentSchema,
    description: 'Description of your component',
    version: '0.1.0',
  },

  initialize(_ctx: AttachableContext, props: unknown): ComponentState {
    const parsed = MyComponentSchema.parse(props);
    return {
      id: parsed.id,
      type: 'my-component',
      values: {},
      errors: [],
      touched: false,
      visible: true,
      disabled: false,
    };
  },

  async onAction(ctx: AttachableContext, actionId: string, _payload: unknown) {
    ctx.dispatch({
      type: 'ACTION_TRIGGERED',
      componentId: ctx.componentId,
      actionId,
    });
  },
};
`;

const BLUEPRINT_MANIFEST = `name: my-blueprint
version: 0.1.0
maturity: experimental
description: Description of your blueprint
outcome: What the user gets from this blueprint
domain: your-domain
components_used:
  - form
  - tasklist
integrations: []
checklists:
  security: []
  logging: []
  schema: []
  mocks: []
  docs: []
`;

const BLUEPRINT_DOCUMENT = `# My Blueprint

## Overview

Describe the purpose of this blueprint.

\`\`\`mdma
id: main-form
type: form
fields:
  - name: title
    type: text
    label: Title
    required: true
onSubmit: submit-form
\`\`\`

## Checklist

\`\`\`mdma
id: tasks
type: tasklist
items:
  - id: step-1
    text: Complete step 1
  - id: step-2
    text: Complete step 2
\`\`\`
`;

export function scaffoldCommand(type: 'attachable' | 'blueprint', name?: string): void {
  const targetName = name ?? `my-${type}`;

  if (type === 'attachable') {
    const dir = join(process.cwd(), targetName);
    if (existsSync(dir)) {
      console.log(chalk.red(`Directory "${targetName}" already exists.`));
      return;
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'handler.ts'), ATTACHABLE_TEMPLATE);
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify(
        {
          name: `@mdma/attachable-${targetName}`,
          version: '0.1.0',
          type: 'module',
          main: './handler.ts',
          dependencies: {
            '@mdma/spec': 'workspace:*',
            '@mdma/runtime': 'workspace:*',
            zod: '^3.24.0',
          },
        },
        null,
        2,
      ),
    );
    console.log(chalk.green(`Attachable scaffolded at ./${targetName}/`));
  } else if (type === 'blueprint') {
    const dir = join(process.cwd(), 'blueprints', targetName);
    if (existsSync(dir)) {
      console.log(chalk.red(`Blueprint "${targetName}" already exists.`));
      return;
    }
    mkdirSync(join(dir, 'demo-data'), { recursive: true });
    writeFileSync(join(dir, 'manifest.yaml'), BLUEPRINT_MANIFEST.replace(/my-blueprint/g, targetName));
    writeFileSync(join(dir, 'document.md'), BLUEPRINT_DOCUMENT);
    writeFileSync(join(dir, 'README.md'), `# ${targetName}\n\nDescribe your blueprint here.\n`);
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: `@mdma/blueprint-${targetName}`, version: '0.1.0', private: true }, null, 2),
    );
    console.log(chalk.green(`Blueprint scaffolded at ./blueprints/${targetName}/`));
  }
}
