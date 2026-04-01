import { useState, useEffect, useRef, useCallback } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { createDocumentStore, type DocumentStore } from '@mobile-reality/mdma-runtime';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { StoreAction } from '@mobile-reality/mdma-spec';
import { documents } from './documents.js';
import { ChatView } from './ChatView.js';
import { CustomChatView } from './CustomChatView.js';
import { PlaygroundView } from './PlaygroundView.js';
import { ValidatorView } from './ValidatorView.js';
import { StepperView } from './StepperView.js';

type Mode = 'examples' | 'chat' | 'custom' | 'playground' | 'validator' | 'stepper';

interface NavItem {
  mode: Mode;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Documents',
    items: [{ mode: 'examples', label: 'Examples' }],
  },
  {
    label: 'AI',
    items: [
      { mode: 'chat', label: 'AI Chat' },
      { mode: 'custom', label: 'Custom Components' },
      { mode: 'playground', label: 'Playground' },
    ],
  },
  {
    label: 'Tools',
    items: [{ mode: 'validator', label: 'Validator' }],
  },
];

function getModeLabel(mode: Mode): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.mode === mode) return item.label;
    }
  }
  return mode;
}

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

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
          <div className="demo-nav" ref={dropdownRef}>
            <button
              type="button"
              className="demo-nav-trigger"
              onClick={() => setDropdownOpen((v) => !v)}
            >
              {getModeLabel(mode)}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="demo-nav-dropdown">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label} className="demo-nav-group">
                    <div className="demo-nav-group-label">{group.label}</div>
                    {group.items.map((item) => (
                      <button
                        key={item.mode}
                        type="button"
                        className={`demo-nav-item ${mode === item.mode ? 'demo-nav-item--active' : ''}`}
                        onClick={() => {
                          setMode(item.mode);
                          setDropdownOpen(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
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

      {mode === 'validator' ? (
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
                <p className="demo-event-empty">Interact with the document to see events here.</p>
              )}
              {events.map((entry) => (
                <div key={entry.id} className="demo-event-entry">
                  <span className="demo-event-time">{entry.timestamp}</span>
                  <span className={`demo-event-type demo-event-type--${entry.action.type}`}>
                    {entry.action.type}
                  </span>
                  <span className="demo-event-component">{entry.action.componentId}</span>
                  {'field' in entry.action && (
                    <span className="demo-event-detail">
                      .{entry.action.field} ={' '}
                      {JSON.stringify((entry.action as { value: unknown }).value)}
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
