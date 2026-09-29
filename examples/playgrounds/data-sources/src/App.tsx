import { remarkMdma } from '@mobile-reality/mdma-parser';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import { type DocumentStore, createDocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import { useEffect, useState } from 'react';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { clearCallLog, useCallLog } from './call-log.js';
import { createMockSources } from './mock-sources.js';
import { SCENARIOS, type Scenario } from './scenarios.js';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdma, {});

interface Loaded {
  ast: MdmaRoot;
  store: DocumentStore;
}

async function load(scenario: Scenario): Promise<Loaded> {
  const ast = (await processor.run(processor.parse(scenario.markdown))) as MdmaRoot;
  clearCallLog();
  const store = createDocumentStore(ast, { dataSources: createMockSources() });
  return { ast, store };
}

function readHashScenario(): Scenario {
  return SCENARIOS.find((s) => `#/${s.id}` === window.location.hash) ?? SCENARIOS[0];
}

function useHashScenario(): Scenario {
  const [scenario, setScenario] = useState<Scenario>(readHashScenario);
  useEffect(() => {
    const onChange = () => setScenario(readHashScenario());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return scenario;
}

function CallLog() {
  const entries = useCallLog();
  return (
    <aside className="pg-log" aria-label="Resolver calls">
      <h2>Resolver calls</h2>
      {entries.length === 0 && <p className="pg-log-empty">No calls yet.</p>}
      <ol data-testid="call-log">
        {entries.map((entry) => (
          <li key={entry.n} data-kind={entry.kind} data-source={entry.source}>
            <span className="pg-log-kind">{entry.kind}</span>
            <span className="pg-log-source">{entry.source}</span>
            <span className="pg-log-detail">{entry.detail}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function App() {
  const scenario = useHashScenario();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    load(scenario).then((next) => {
      if (!cancelled) setLoaded(next);
    });
    return () => {
      cancelled = true;
    };
  }, [scenario]);

  return (
    <div className="pg-shell">
      <header className="pg-header">
        <h1>Data sources playground</h1>
        <nav aria-label="Scenarios">
          {SCENARIOS.map((s) => (
            <a
              key={s.id}
              href={`#/${s.id}`}
              aria-current={s.id === scenario.id ? 'page' : undefined}
              data-scenario={s.id}
            >
              {s.title}
            </a>
          ))}
        </nav>
      </header>
      <p className="pg-hint">{scenario.hint}</p>
      <div className="pg-body">
        <main className="pg-main" data-scenario-view={scenario.id}>
          {loaded && <MdmaDocument key={scenario.id} ast={loaded.ast} store={loaded.store} />}
        </main>
        <CallLog />
      </div>
    </div>
  );
}
