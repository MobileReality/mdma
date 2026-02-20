import { useState, useEffect, useRef, useCallback } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mdma/parser';
import { createDocumentStore, type DocumentStore } from '@mdma/runtime';
import { MdmaDocument } from '@mdma/renderer-react';
import type { MdmaRoot } from '@mdma/spec';
import type { StoreAction } from '@mdma/spec';
import { documents } from './documents.js';
import { ChatView } from './ChatView.js';
import { CustomChatView } from './CustomChatView.js';
import { PlaygroundView } from './PlaygroundView.js';
import { ValidatorView } from './ValidatorView.js';
import { StepperView } from './StepperView.js';

type Mode = 'examples' | 'chat' | 'custom' | 'playground' | 'validator' | 'stepper';

interface EventEntry {
  id: number;
  timestamp: string;
  action: StoreAction;
}

const docKeys = Object.keys(documents);

// Module-level singleton — initialized once, reused across all parses
const processor = unified().use(remarkParse).use(remarkMdma);

async function parseDocument(markdown: string): Promise<MdmaRoot> {
  const tree = processor.parse(markdown);
  return (await processor.run(tree)) as MdmaRoot;
}

export function App() {
  const [mode, setMode] = useState<Mode>('examples');
  const [selectedDoc, setSelectedDoc] = useState(docKeys[0]);
  const [ast, setAst] = useState<MdmaRoot | null>(null);
  const [store, setStore] = useState<DocumentStore | null>(null);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const eventIdRef = useRef(0);
  const eventLogRef = useRef<HTMLDivElement>(null);

  const loadFromMarkdown = useCallback(async (markdown: string) => {
    setError(null);
    setEvents([]);
    eventIdRef.current = 0;

    try {
      const parsedAst = await parseDocument(markdown);
      const newStore = createDocumentStore(parsedAst);

      newStore.getEventBus().onAny((action: StoreAction) => {
        const entry: EventEntry = {
          id: ++eventIdRef.current,
          timestamp: new Date().toLocaleTimeString(),
          action,
        };
        setEvents((prev) => [...prev, entry]);
      });

      setAst(parsedAst);
      setStore(newStore);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setAst(null);
      setStore(null);
    }
  }, []);

  useEffect(() => {
    if (mode === 'examples') {
      loadFromMarkdown(documents[selectedDoc].markdown);
    }
  }, [selectedDoc, mode, loadFromMarkdown]);

  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="demo-layout">
      <header className="demo-header">
        <div className="demo-header-left">
          <h1 className="demo-title">MDMA</h1>
          <span className="demo-subtitle">Interactive Document Demo</span>
        </div>
        <div className="demo-header-right">
          <div className="demo-mode-tabs">
            <button
              type="button"
              className={`demo-mode-tab ${mode === 'examples' ? 'demo-mode-tab--active' : ''}`}
              onClick={() => setMode('examples')}
            >
              Examples
            </button>
            <button
              type="button"
              className={`demo-mode-tab ${mode === 'chat' ? 'demo-mode-tab--active' : ''}`}
              onClick={() => setMode('chat')}
            >
              AI Chat
            </button>
            <button
              type="button"
              className={`demo-mode-tab ${mode === 'custom' ? 'demo-mode-tab--active' : ''}`}
              onClick={() => setMode('custom')}
            >
              Custom Components
            </button>
            <button
              type="button"
              className={`demo-mode-tab ${mode === 'playground' ? 'demo-mode-tab--active' : ''}`}
              onClick={() => setMode('playground')}
            >
              Playground
            </button>
            <button
              type="button"
              className={`demo-mode-tab ${mode === 'validator' ? 'demo-mode-tab--active' : ''}`}
              onClick={() => setMode('validator')}
            >
              Validator
            </button>
            <button
              type="button"
              className={`demo-mode-tab ${mode === 'stepper' ? 'demo-mode-tab--active' : ''}`}
              onClick={() => setMode('stepper')}
            >
              Stepper
            </button>
          </div>
          {mode === 'examples' && (
            <select
              className="demo-doc-selector"
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
            >
              {docKeys.map((key) => (
                <option key={key} value={key}>
                  {documents[key].label}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      {mode === 'stepper' ? (
        <StepperView />
      ) : mode === 'validator' ? (
        <ValidatorView />
      ) : mode === 'playground' ? (
        <PlaygroundView />
      ) : mode === 'custom' ? (
        <CustomChatView />
      ) : mode === 'examples' ? (
        <div className="demo-main">
          <div className="demo-document-panel">
            {error && (
              <div className="demo-error">
                <strong>Parse Error:</strong> {error}
              </div>
            )}
            {ast && store && <MdmaDocument ast={ast} store={store} />}
          </div>
          <div className="demo-event-panel">
            <h2 className="demo-event-title">Event Log</h2>
            <div className="demo-event-log" ref={eventLogRef}>
              {events.length === 0 && (
                <p className="demo-event-empty">
                  Interact with the document to see events here.
                </p>
              )}
              {events.map((entry) => (
                <div key={entry.id} className="demo-event-entry">
                  <span className="demo-event-time">{entry.timestamp}</span>
                  <span className={`demo-event-type demo-event-type--${entry.action.type}`}>
                    {entry.action.type}
                  </span>
                  <span className="demo-event-component">
                    {entry.action.componentId}
                  </span>
                  {'field' in entry.action && (
                    <span className="demo-event-detail">
                      .{entry.action.field} = {JSON.stringify((entry.action as { value: unknown }).value)}
                    </span>
                  )}
                  {'actionId' in entry.action && (
                    <span className="demo-event-detail">
                      action: {(entry.action as { actionId: string }).actionId}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <ChatView />
      )}
    </div>
  );
}
