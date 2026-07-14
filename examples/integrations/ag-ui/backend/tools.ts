/** The two functions the model can call. */

/** The function the agent prompt tells the model to call. Its `document` arg IS the MDMA. */
export const GENERATE_MDMA_TOOL = {
  type: 'function',
  function: {
    name: 'generate_mdma',
    description:
      'Build an interactive MDMA document (form, table, approval gate, tasklist, chart, …).',
    parameters: {
      type: 'object',
      properties: {
        document: { type: 'string', description: 'The complete MDMA markdown document.' },
      },
      required: ['document'],
    },
  },
};

/** Write structured data into shared state — the source of truth rendered components read from. */
export const SET_STATE_TOOL = {
  type: 'function',
  function: {
    name: 'set_state',
    description:
      'Save structured data the user gives you so forms pre-fill from it and you can recall it. Call it whenever the user provides information (name, email, preferences, or specific form values).',
    parameters: {
      type: 'object',
      properties: {
        componentId: {
          type: 'string',
          description: '"profile" for general user info, or a component/form id.',
        },
        values: {
          type: 'object',
          description: 'field name → value, e.g. { "name": "Marcin", "email": "mar@wp.pl" }',
        },
      },
      required: ['componentId', 'values'],
    },
  },
};

export const AGENT_TOOLS = [GENERATE_MDMA_TOOL, SET_STATE_TOOL];
