import { describe, expect, it } from 'vitest';
import { storeOptionsFor } from '../agent/data-source-options.js';
import { parseMarkdown } from './parse-markdown.js';

const DOCUMENT = `\`\`\`mdma
id: incidents
type: table
label: Incidents
pageSize: 10
columns:
  - key: id
    header: ID
data:
  source: incidents
  params:
    status: open
\`\`\`
`;

describe('parseMarkdown store options', () => {
  it('resolves data source refs when the store gets the resolvers', async () => {
    const { store } = await parseMarkdown(
      DOCUMENT,
      undefined,
      storeOptionsFor({ externalDataSources: true }),
    );
    await store.resolveAllData();
    const slot = store.getDataState('incidents');
    expect(slot?.status).toBe('ready');
    expect(slot?.rows).toHaveLength(10);
    store.dispose();
  });

  it('cannot resolve data source refs without them', async () => {
    const { store } = await parseMarkdown(
      DOCUMENT,
      undefined,
      storeOptionsFor({ externalDataSources: false }),
    );
    await store.resolveAllData();
    expect(store.getDataState('incidents')?.status).not.toBe('ready');
    store.dispose();
  });
});
